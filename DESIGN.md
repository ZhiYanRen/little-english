---
version: alpha
name: 英语小星球
colors:
  primary: "#1f635b"
  background: "#f5f7fa"
  surface: "#ffffff"
  text: "#253447"
  muted: "#617084"
  border: "#dce3e9"
  blue: "#335e9b"
  coral: "#a3443d"
  purple: "#695297"
  green: "#386e58"
  sunshine: "#f6cb63"
  danger: "#ad3c40"
  success: "#21684f"
typography:
  body:
    fontFamily: '"PingFang SC", "Microsoft YaHei", system-ui, sans-serif'
    fontSize: "16px"
    lineHeight: "1.65"
  english:
    fontFamily: '"Avenir Next", "Trebuchet MS", sans-serif'
    lineHeight: "1.3"
rounded:
  control: "14px"
  card: "22px"
spacing:
  unit: "8px"
components:
  button:
    height: "44px"
    rounded: "14px"
---

## Overview

为学龄儿童及陪学家长提供第二版第2级课本学习伴侣。产品界面，不是宣传页。参考用户截图的白色大圆角、深绿品牌、图书与三个模块。记忆点是带星星书签的原创蓝色书本，目录编号就是教材真实单元序号；不复制 Kid’s Box 官方封面插图。

UI/UX Pro Max 的首轮检索给出儿童教育的柔和立体与触控反馈，但营销布局不适用；改为应用侧栏和课本目录。使用主题卡片小面积配色，不做持续漂浮、闪烁、游戏化干扰。

## Colors

语义色值由本文件 colors 定义，经 scripts/build.mjs 自动提取为 dist/tokens.css 的 --color-*，不独立抄写另一套颜色。品牌深绿、蓝色书本和暖黄星星；四组单元以蓝、珊瑚、紫、绿区分。状态有文字和图标，不单凭颜色。

## Typography

中文使用系统字体，英文优先 Avenir Next/Trebuchet MS；不请求外部字体，避免加载跳动。英文学习词句 28—44px，中文正文 16px/1.65，辅助文字至少 12px。句子自然换行，词条不截断。

## Layout

> =1100px：224px 固定侧栏，主内容最多 1320px；目录为三列卡片。768—1099px：184px 侧栏，两列目录。<768px：顶部品牌和底部四项导航，单列或双列紧凑目录。文档自然滚动；不锁主页面高度。安全区域由 env(safe-area-inset-*) 处理；弹窗内部滚动，输入聚焦不被底栏遮挡。

## Elevation & Depth

背景浅灰蓝，白色内容面。卡片使用轻边线与低强度阴影；蓝色书封有书脊和黄色书签，层次只在课本展示处突出。按钮按压 0.98 倍，不延迟操作。

## Shapes

卡片22px、控件14px，目录序号圆角方块。触控操作至少44px；按钮之间至少8px。原创线性SVG图标统一2px描边，装饰图形aria-hidden。

## Components

共享导航、unitCard、studyCard、emptyState、notice 与原生 dialog。按钮 solid/outline/ghost，成功和错误都有内联文本。播放器使用原生 audio controls；速度下拉由系统弹层控制，接受平台外观。表单原生 select 同样接受系统选择体验。

Logo：public/assets/logo.svg 为维护源文件；导航引用 SVG；构建生成32px favicon.png、180px apple-touch-icon.png、192/512px manifest 图标。所有引用相对当前项目路径。无缓存Service Worker，不承诺首次离线。

全局滚动条由样式表定义 thumb/track/hover/active 与 forced-colors；新增滚动区域继承。动效采用 CSS transform/opacity：160ms 按压，220ms 卡片入场；减少动态效果时禁用动画和滚动过渡，功能反馈不变。

## Do's and Don'ts

- 词句、音频显示真实导入数量，不展示虚构的全册收录数字。
- 始终区分官方资源、导入录音、系统朗读；不把知识点摘要当成教材原文。
- 卡片空状态给出导入与官方入口；没有词句时不出现空白答题区。
- 不使用长篇宣传首屏、重复页脚、复制官方角色图、不依赖悬停。

### 官方资源视图

单元增加“官方资源”页，与单词、句子、听力共用导航。没有本机词句时，课本卡片优先进入资源页；已有词句仍进入认读。资源目录采用现有白色surface、线性图标与章节编号，不新增封面缩略图或未授权素材。视频条目是静态文字目录，播放按钮只指向官网对应章节，不能伪装成站内播放器。手机四个标签采用2×2排列，保证44px触控与320px无横向溢出。

官方公开资料使用标题、文件格式和适用范围说明；第1单元样张/样例音频与同步练习资料严格区分。目录数量不计入“已导入词句”“已掌握”或学习成绩。
