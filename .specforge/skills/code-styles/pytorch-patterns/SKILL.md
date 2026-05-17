---
name: pytorch-patterns
type: code-style
description: >-
  PyTorch 代码规范——设备无关、可复现、张量形状管理、nn.Module 组织、训练/评估循环、DataLoader 优化、混合精度、checkpoint。编写或审查 PyTorch 训练脚本、模型、数据管道时触发。
  触发词：PyTorch、torch、nn.Module、DataLoader、autograd、AMP、checkpoint、CUDA、tensor shape。
version: "1.0.0"
author: "wta"
---

# PyTorch 代码规范

> Python 通用风格见 `skills/code-styles/python-patterns/`；本技能聚焦 PyTorch 特有的坑与模式。

## Iron Law

> **设备无关、可复现、形状显式。** 代码要在任何 `device`、任何 seed、任何 batch size 上表现一致；张量形状要写在注释里，而不是等运行时再猜。

## 1. 三条核心原则

### 1.1 设备无关

```python
# ✅ 可移植
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = Model().to(device)
x = x.to(device, non_blocking=True)

# ❌ 写死 GPU
model = Model().cuda()
```

多卡场景优先 `torch.accelerator` / `device_map`（Accelerate、DeepSpeed），不要手写 `cuda:0`。

### 1.2 可复现实验

```python
def set_seed(seed: int = 42) -> None:
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)
    np.random.seed(seed)
    random.seed(seed)
    torch.backends.cudnn.deterministic = True
    torch.backends.cudnn.benchmark = False   # 可复现与性能二选一
```

**注意**：`cudnn.deterministic=True` 会牺牲 5-20% 吞吐；正式训练可关，调试/消融必须开。DataLoader 多 worker 还需要 `worker_init_fn` 单独设种子。

### 1.3 形状显式标注

```python
def forward(self, x: Tensor) -> Tensor:
    # x: (B, C, H, W)
    x = self.conv(x)              # -> (B, 32, H, W)
    x = self.pool(x)              # -> (B, 32, H//2, W//2)
    x = x.flatten(1)              # -> (B, 32 * H//2 * W//2)
    return self.fc(x)             # -> (B, num_classes)
```

大模型/复杂 tensor 流优先考虑 `einops.rearrange` —— 把形状写进字符串，IDE 也能读懂。

## 2. nn.Module 组织

### 2.1 结构化拼装

```python
class ImageClassifier(nn.Module):
    def __init__(self, num_classes: int, dropout: float = 0.5) -> None:
        super().__init__()
        self.features = nn.Sequential(
            nn.Conv2d(3, 64, 3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(2),
        )
        self.classifier = nn.Sequential(
            nn.Dropout(dropout),
            nn.Linear(64 * 16 * 16, num_classes),
        )

    def forward(self, x: Tensor) -> Tensor:
        return self.classifier(self.features(x).flatten(1))
```

**红线**：

- 不在 `forward` 里 `new` 层或权重——每次前向都会新建、梯度追不上。
- 不用 `F.conv2d(x, self.weight)` 这种手动风格，除非你在写自定义层。
- 层参数通过 `__init__` 注入，便于测试和序列化。

### 2.2 权重初始化

```python
def init_weights(m: nn.Module) -> None:
    if isinstance(m, nn.Linear):
        nn.init.kaiming_normal_(m.weight, nonlinearity="relu")
        if m.bias is not None:
            nn.init.zeros_(m.bias)
    elif isinstance(m, nn.Conv2d):
        nn.init.kaiming_normal_(m.weight, mode="fan_out", nonlinearity="relu")
    elif isinstance(m, (nn.BatchNorm1d, nn.BatchNorm2d)):
        nn.init.ones_(m.weight)
        nn.init.zeros_(m.bias)

model.apply(init_weights)
```

PyTorch 2.x 的默认初始化已合理；**仅在**论文复现或指标不收敛时再改。

## 3. 训练/评估循环

### 3.1 训练循环骨架

```python
def train_one_epoch(
    model: nn.Module,
    loader: DataLoader,
    optimizer: torch.optim.Optimizer,
    criterion: nn.Module,
    device: torch.device,
    scaler: torch.amp.GradScaler | None = None,
) -> float:
    model.train()
    total = 0.0
    for data, target in loader:
        data, target = data.to(device, non_blocking=True), target.to(device, non_blocking=True)
        optimizer.zero_grad(set_to_none=True)  # 比 zero_grad() 更省显存

        with torch.amp.autocast("cuda", enabled=scaler is not None):
            loss = criterion(model(data), target)

        if scaler is not None:
            scaler.scale(loss).backward()
            scaler.unscale_(optimizer)
            nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            scaler.step(optimizer)
            scaler.update()
        else:
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()

        total += loss.item()
    return total / len(loader)
```

### 3.2 评估循环

```python
@torch.no_grad()
def evaluate(model, loader, criterion, device) -> tuple[float, float]:
    model.eval()                              # ❗ 不可省：关 dropout、用 BN running stats
    loss_sum, correct, n = 0.0, 0, 0
    for data, target in loader:
        data, target = data.to(device), target.to(device)
        out = model(data)
        loss_sum += criterion(out, target).item()
        correct += (out.argmax(1) == target).sum().item()
        n += target.size(0)
    return loss_sum / len(loader), correct / n
```

**检查点**：`model.train()` 和 `model.eval()` **每个循环开头都显式调用**，不要假设前一个状态。

## 4. 数据管道

### 4.1 Dataset

```python
class ImageDataset(Dataset):
    def __init__(self, root: str, labels: dict[str, int], transform=None):
        self.paths = sorted(Path(root).glob("*.jpg"))
        self.labels = labels
        self.transform = transform

    def __len__(self) -> int:
        return len(self.paths)

    def __getitem__(self, i: int) -> tuple[Tensor, int]:
        img = Image.open(self.paths[i]).convert("RGB")
        if self.transform:
            img = self.transform(img)
        return img, self.labels[self.paths[i].stem]
```

`__init__` 只收集索引；IO 留到 `__getitem__`，让 `num_workers` 并行化有意义。

### 4.2 DataLoader 调优

```python
loader = DataLoader(
    dataset,
    batch_size=32,
    shuffle=True,
    num_workers=4,             # I/O 并发；CPU 核数的 25-50% 起步
    pin_memory=True,           # 配合 .to(device, non_blocking=True) 流水线传输
    persistent_workers=True,   # 跨 epoch 复用 worker，省启动开销
    drop_last=True,            # 固定 batch 尺寸，BatchNorm/Compile 友好
)
```

### 4.3 变长序列 collate

```python
def collate_fn(batch):
    seqs, labels = zip(*batch)
    padded = nn.utils.rnn.pad_sequence(seqs, batch_first=True, padding_value=0)
    lengths = torch.tensor([s.size(0) for s in seqs])
    return padded, lengths, torch.tensor(labels)
```

下游用 `pack_padded_sequence` 避免对 padding 做无用计算。

## 5. Checkpoint

**只存 `state_dict`，不存整个模型。** 存模型对象会把实现类路径、Python 版本一起绑死。

```python
def save_checkpoint(model, optimizer, epoch, loss, path):
    torch.save({
        "epoch": epoch,
        "model_state_dict": model.state_dict(),
        "optimizer_state_dict": optimizer.state_dict(),
        "scaler_state_dict": scaler.state_dict() if scaler else None,
        "loss": loss,
    }, path)

def load_checkpoint(path, model, optimizer=None):
    ckpt = torch.load(path, map_location="cpu", weights_only=True)  # ❗ 默认开 weights_only
    model.load_state_dict(ckpt["model_state_dict"])
    if optimizer:
        optimizer.load_state_dict(ckpt["optimizer_state_dict"])
    return ckpt
```

**`weights_only=True`** 从 PyTorch 2.4 起是默认值，且强烈推荐：避免加载远端 ckpt 时 pickle 任意代码执行。

## 6. 性能开关

| 技术 | 何时用 | 配置 |
|------|-------|------|
| AMP (`torch.amp.autocast` + `GradScaler`) | 任何 FP16/BF16 可用的 GPU | 看 §3.1 |
| `torch.compile(model)` | PyTorch 2.0+；模型结构稳定 | `model = torch.compile(model, mode="reduce-overhead")` |
| Gradient Checkpointing | 显存不够、愿意 1.3-2x 计算换显存 | `torch.utils.checkpoint.checkpoint(block, x, use_reentrant=False)` |
| `cudnn.benchmark = True` | 输入尺寸恒定 | 禁用复现性时开；首次 batch 会自动搜索算法 |
| `channels_last` memory format | Conv-heavy、Ampere 以上 | `model = model.to(memory_format=torch.channels_last)` |
| DDP / FSDP | 多卡 | 单机多卡默认 DDP，模型 > 1 卡显存上 FSDP |

**红线**：`torch.compile` 后 **不要**再修改 `model` 的 `forward` 层级属性（触发重编译）；首 batch 会变慢，这是正常编译成本。

## 7. 反模式红线

| 反模式 | 问题 | 修正 |
|-------|------|------|
| 验证时忘 `model.eval()` | Dropout/BN 仍按训练模式，指标虚低 | 每次验证前显式 `model.eval()` |
| 在 residual 上用 `inplace=True` 或 `x += y` | 破坏 autograd 图 | 用 `x = F.relu(x)`、`x = x + y` |
| 循环里反复 `model.cuda()` | 每步都搬模型，显存+时间双杀 | 循环外一次 `.to(device)` |
| 先 `.item()` 再 `.backward()` | 断开计算图 | `.item()` 只用于 **日志** |
| 用 `torch.save(model, ...)` | 反序列化依赖原类路径 | 存 `state_dict` |
| `load` 时不带 `weights_only=True` | pickle 远端代码执行 | 显式 `weights_only=True` |
| `num_workers=0` 默认 | CPU 成为瓶颈 | 起步 4，按 `top`/`nvidia-smi` 调 |
| 训练/验证共用一个 loader | BatchNorm 统计串污染 | 两份 loader，验证集 `shuffle=False` |
| `torch.tensor(list).to(device)` 每步构造 | 反复内存拷贝 | 预先构造或放入 Dataset |
| 混精下忘记 `scaler.unscale_` 就裁剪梯度 | 裁剪在缩放后的梯度上，阈值失真 | 先 `unscale_` 再 `clip_grad_norm_` |

## 8. 自检清单

- [ ] 所有张量与模型都通过 `.to(device)` 放置，无硬编码 `.cuda()`
- [ ] 设置了 `torch.manual_seed` / `cuda.manual_seed_all`，记录 seed
- [ ] `model.train()` / `model.eval()` 每次循环显式调用
- [ ] `optimizer.zero_grad(set_to_none=True)`
- [ ] DataLoader 开了 `num_workers`、`pin_memory`、`persistent_workers`
- [ ] Checkpoint 只存 `state_dict`，加载带 `weights_only=True`
- [ ] 使用 AMP/`torch.compile`/GradCheckpoint 前，有无 AMP 基线做对照
- [ ] 梯度裁剪在 `unscale_` 之后、`step` 之前
- [ ] 验证集 `shuffle=False`、`@torch.no_grad()`
- [ ] 形状在注释或 `einops` 里写明

## 9. 调试利器

```python
# 显存分析
print(torch.cuda.memory_summary())

# 性能分析
with torch.profiler.profile(
    activities=[torch.profiler.ProfilerActivity.CPU, torch.profiler.ProfilerActivity.CUDA],
    record_shapes=True,
) as prof:
    train_step()
print(prof.key_averages().table(sort_by="cuda_time_total", row_limit=10))

# NaN/Inf 侦测
torch.autograd.set_detect_anomaly(True)   # 仅调试期开；慢 2-5 倍
```

## 10. 关联

- Python 通用风格：`skills/code-styles/python-patterns/`
- 测试策略（含 PyTorch 单元测试）：`skills/testing/python-testing-pytest/`
- 运行命令矩阵：`skills/workflow-steps/language-adapters/`
