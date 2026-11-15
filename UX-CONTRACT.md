# 学习交互约定

## 业务证据

用户确认第二版第2级整册12单元，采用官方资源入口与本机导入；来源详见 SOURCES.md。没有账号、收费、权限或删除业务。原版文件不公开发布。目录可用不等于教材已收录。

## Canonical UI Map

| Capability     | Canonical owner                  | Source of truth | Allowed variants         | Verification               |
| -------------- | -------------------------------- | --------------- | ------------------------ | -------------------------- |
| Form           | app.js openEditor / handleEditor | 本文            | add / edit               | browser tests              |
| Select/Listbox | native select                    | DESIGN.md       | type / unit / speed      | keyboard and OS popup      |
| Scrollbar      | styles.css global baseline       | DESIGN.md       | dialog geometry only     | computed browser style     |
| Toast          | #status + announce               | 本文            | info / success / warning | live region                |
| Dialog         | native dialog + openDialog       | 本文            | entry / import preview   | Escape / focus restoration |

## 流程

- #/book 展示12单元，#/unit/N/words、sentences、audio 为同级页；#/review 错题、#/progress 进度、#/materials 学习资料。链接可刷新和后退。无效 hash 恢复课本目录。
- 顶部官方资源入口始终为对应单元的原生新窗口链接，rel=noopener noreferrer。失败由官方站点处理，本工具不绕过激活。
- 单元列表和学习视图状态保存在当前会话；导航后主动停止录音与系统朗读。输入草稿在切换模式时保留，不自动判分；Enter 输入法组合状态不提交。
- 听写必须填写非空答案，提交后锁定本次作答，显示正确答案与结果；再次尝试才清空并解锁，避免连续点击重复计分。错误进入复习本，后续答对移出。认识/还不熟只控制掌握状态。
- 搜索仅本机即时过滤，非空有清除按钮，切换词条后恢复查询。搜索不写URL，因为包含用户私有教材文字；刷新后清空，这是公开URL隐私例外。
- 所有空状态给出下一步；词句为0时去资料页，音频缺失时导入同名录音或使用明确标注的系统朗读，不宣称原版播放成功。
- 导入 JSON/TSV 完整校验后预览，确认前不写入；按单元、类型、英文内容合并，保留现有释义，进度只取不倒退的计数，错题状态按时间。重复不增加条目。编辑只修改中文/音频/时间，英文内容不可编辑以稳定进度ID。
- 音频文件保存于IndexedDB，同名已保存文件跳过，事务失败不添加录音条目；不悄悄覆盖。最多50个文件、单个100MB。支持mp3/m4a/wav/ogg/webm/aac/flac，解码是否支持以浏览器为准。无匹配文件提供重新导入。
- 时间分段在元数据加载后校验，超出时提示；媒体切换取消旧加载，释放Blob URL，循环仅限用户主动启用。
- localStorage损坏或不可写时保留原数据、仅会话使用并持续提示。导出包含文字和进度，不含音频；用户保留原始音频重新导入。本机备份不自动上传。
- 其他标签页保存时更新数据；写入前读取最新本机状态，尽量避免同源标签页覆盖。极同时写入仍以浏览器最后写入为准，无跨设备同步。
- 所有动态文字转义；音频仅文件名和本机Blob，不接受远程网址或代码；导入校验失败不改变已有状态。

## 无障碍与状态

共享 notice 为持久信息，#status 为礼貌live region；错误关联具体字段。原生dialog提供焦点限制与Escape，关闭恢复触发者焦点。页面导航聚焦主标题，触控/键盘等价，按钮44px。遵守减少动态效果；原生audio与select接受系统交互。中文界面、英文学习内容使用lang=en。

音频文件名使用原生 datalist 建议，接受平台所有的弹层几何与键盘交互；输入任意文件名仍可保存，不依赖建议列表。
