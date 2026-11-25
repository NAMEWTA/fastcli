-------------------------- MODULE Reservation --------------------------
EXTENDS Integers, FiniteSets

CONSTANTS Actors, AllowStaleCommit
VARIABLES available, phase, held
vars == <<available, phase, held>>

\* 演示只有一个可预留名额；实际模型必须使用项目自己的范围。
Init == /\ available = 1
        /\ phase = [a \in Actors |-> "idle"]
        /\ held = {}

Read(a) == /\ phase[a] = "idle"
           /\ available > 0
           /\ phase' = [phase EXCEPT ![a] = "checked"]
           /\ UNCHANGED <<available, held>>

\* FALSE 表示提交时重新校验；TRUE 演示沿用过时读取结果的缺陷。
Commit(a) == /\ phase[a] = "checked"
             /\ (AllowStaleCommit \/ available > 0)
             /\ available' = available - 1
             /\ held' = held \cup {a}
             /\ phase' = [phase EXCEPT ![a] = "done"]

\* 完成或暂时无法推进时允许状态不变；这不声称请求最终会成功。
Wait == UNCHANGED vars
Next == (\E a \in Actors : Read(a) \/ Commit(a)) \/ Wait

NoOversell == available >= 0 /\ Cardinality(held) <= 1
TypeOK == /\ available \in -Cardinality(Actors)..1
          /\ phase \in [Actors -> {"idle", "checked", "done"}]
          /\ held \subseteq Actors
=============================================================================
