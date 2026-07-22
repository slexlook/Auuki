# Changelog

本文档按版本号（SemVer）组织。  
当前为本分支定义的新版本：`v0.4.1`。

## v0.4.1 (2026-07-22)

> 对比范围：`master...cursor/free-ride-workout-9d8c`

### Release Notes

#### 新增功能
- 恢复 **Free ride** 自由骑会话：在 Workout 列表顶部增加不可删除的特殊项。
- 无上次选中记录时默认选中 Free ride；有本地 `currentWorkoutId` 时仍恢复上次课程。
- 选中 Free ride 后按 Start：仅启动计时，由用户手动控制 ERG / Resistance / Slope；Stop 后照常生成 FIT。
- 选中普通 workout 后按 Start：行为与现有一致（计时 + 结构化课程）。

#### 体验改进
- Free ride 在列表中隐藏 Delete / options，避免误删。
- Free ride 骑行中 Back / Lap 仍可用于记圈并重置 INTERVAL TIME（与旧版自由骑一致）。

#### 测试
- 补充 Free ride 工厂、默认选中、删除保护等相关单测。

### 提交清单（按提交顺序）
1. **7f96e94** - 恢复 Free ride 作为默认可选、不可删除的自由骑会话。  
2. **296555b** - 版本号更新为 `0.4.1`，并补充 Changelog。

## v0.4.0 (2026-06-10)

> 对比范围：`master...support-textevent-in-workout`  
> 提交数量：19

### Release Notes

#### 新增功能
- 新增 **Workout Text Event** 支持，并增强关联声音事件处理。
- 支持从目录获取与解析 workout 资源，提升可扩展性。
- 图表新增 **cadence** 展示与开关控制，支持更多训练可视化场景。
- 增加 cycling power measurement、activity、profiles 相关支持。

#### 体验与可视化改进
- 重构 `workout-text-event` 与图表相关样式，提升可读性与响应式表现。
- MoxyGraph 增加样本管理、功率区间填充、交互指示等能力。
- Workout 列表增加 **PSS** 与 cadence target 展示，训练信息更完整。

#### 算法与逻辑优化
- 自动步进切换时引入 **5W 功率取整**，使功率目标更稳定、可执行。
- 新增 `rampPSS` 计算逻辑，支持 ramp 型区间负荷计算。
- `fetchDirectoryResource` 缓存策略优化，提升资源拉取效率与一致性。
- `PowerTargetControl` 加入锁定机制，避免锁定状态下出现非预期更新。

#### 修复
- 修复页面刷新（F5）后未正确恢复上次选中 workout 的问题。

#### 测试
- 补充并更新 FIT、Workout、ZWO、MoxyGraph、Workout List 等测试用例，覆盖新增能力与关键回归路径。

### 提交清单（按提交顺序）
1. **c6a392a** - 初步加入 workout text event 支持。  
2. **85ba36e** - 支持 hosted authentication，并在 UI 中处理不支持功能提示。  
3. **6a8f8a0** - 优化 `workout-text-event` 样式布局与响应式表现。  
4. **8df7e00** - 支持从目录获取并解析 workouts。  
5. **f9af4df** - 重构 `workout-text-event` 样式可读性，并加入 sound event 处理。  
6. **ee4e158** - MoxyGraph 增加踏频（cadence）支持并改进图表样式。  
7. **e807f72** - `ReactiveConnectable` 改为 `exists` 判断 `rrInterval`，并增强 MoxyGraph 的 resize/page 处理。  
8. **2232411** - MoxyGraph 增加样本管理（裁剪与渲染）。  
9. **6b7cad2** - 增加 cycling power measurement、activity、profiles 支持，并增强 MoxyGraph 与 RevOverTime。  
10. **e5ec29f** - MoxyGraph 增加功率区间填充渲染，并更新样式与测试。  
11. **22d4376** - 调整 `flux.css` 输入元素背景透明度。  
12. **354301a** - Workout 列表新增 PSS 计算与展示，并补充测试。  
13. **758a42e** - 增加 cadence target 展示，格式为当前值/目标值后缀，并更新测试。  
14. **2d73ea3** - 拉取逻辑重构为 `fetchDirectoryResource`，改进缓存处理并更新测试。  
15. **b5a0b9e** - 新增 `rampPSS` 计算逻辑（ramp 型区间），并补充测试。  
16. **25cbe31** - 在 `PowerTargetControl` 增加锁定机制，防止锁定状态下被更新。  
17. **0e0e056** - 图表新增 cadence 开关、交互指示与样式更新。  
18. **74e4fdb** - 自动步进切换时加入 5W 功率取整。  
19. **e0f4487** - 修复 F5 刷新后恢复上次选中 workout。  
