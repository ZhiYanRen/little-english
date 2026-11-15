# 内容来源与边界

2026-11-15 核对：

- 外研社《剑桥国际少儿英语（第二版）》配套资源：https://kb.unischool.cn/ 。包含样张、音频与教学资源入口。
- 外研社第 2 级官方目录：https://www.unischool.cn/kb/resource/kb2/book2/unit1/ 。12 个单元从 Hello again! 到 On holiday!；本工具仅列目录名称、自己编写的中文主题概述和对应官方页面链接。
- Cambridge 目录：https://www.cambridge.org/gb/download_file/view/919866/ （ISBN 9781316627679，Updated Second Edition 英式版）。仅作为知识点对照，不据此声称与用户中国版每页完全一致。中国版单元名称以外研社为准，不硬编码未经核对的页码。

本应用没有内置整册词表、课文、对话、歌曲或录音。用户导入内容与音频均仅保留本机，不会自动进入源码或发布产物。公开样例使用独立编写的技术测试内容，不标为教材内容。

GitHub Actions 版本在 2026-11-15 核对官方 latest releases：checkout v7、setup-node v7、configure-pages v6、upload-pages-artifact v5、deploy-pages v5；参考 https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages 。

## 官方资源索引更新 · 2026-11-15

逐一读取外研社第2级unit1/至unit12/的公开目录，核对56项视频标题、172项学生用书/活动用书合并音轨标题。生成的public/official-resources.js只含标题、核对日期、适用版本、公开单元目录地址与4个公开下载链接，不含课文短句、隐藏播放文章地址或媒体文件。每页播放操作均调用activation/checkActivationed，需登录激活；本应用不请求该API，也不绕过它。

官网“免费资源”区的4份链接已用HEAD核验HTTP 200与格式，未下载或转载内容：

- 学生用书2第1单元样张：https://cdn-web.unischool.cn/kb/mfzy/yzyyp/KB2XS2_U1_yz.pdf
- 同单元样例音频ZIP：https://cdn-web.unischool.cn/kb/mfzy/yzyyp/KB2XS2_U1_yp.zip
- 同步练习与测试2配套音频RAR：https://cdn-web.unischool.cn/kb/mfzy/tblxyp/KB2_worksheets_and_tests_audio.rar
- 同步练习与测试2答案与听力文本：https://cdn-web.unischool.cn/kb/mfzy/tblxda/KB2_key_and_tapescript.pdf

后两项为另一本配套练习的资料，不能标成学生用书12单元整册原文/录音。第1单元样张也不能标成全册教材。搜索结果中的New Generation/第三版与本册不同，未混入。

维护：`node scripts/refresh-official-resources.mjs YYYY-MM-DD`；手动检查新增/移除条目后再提交。CI和网页运行不抓取出版社，也不依赖后台服务。没有找到可确认允许整册公开转载的原版短句与视频，故未将整册原句或视频复制到本项目；只整理合法官方入口与公开资料链接。
