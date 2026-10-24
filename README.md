# dsh-view-studio · 视图工作室

给 [DeepSeek Harness](https://github.com/deepseek-ai) 的 Web UI 换一张脸：壁纸、视频背景、滤镜和配色，都在侧边栏的一个面板里调。

![icon](icon.svg)

## 功能

| 分组 | 内容 |
| --- | --- |
| 壁纸 | 图片 URL、本地图片（自动压缩到最长边 2000px 的 WebP/JPEG）、`Ctrl+V` 粘贴剪贴板图片、5 个渐变预设 |
| 视频 | MP4 / WebM / MOV，最大 120 MB；存进 IndexedDB，静音循环播放 |
| 背景效果 | 模糊 0–40px、亮度 40–160%、饱和度 0–200%、暗化 0–70% |
| 布局 | 填充方式（铺满 / 完整显示）、对齐（居中 / 顶部 / 底部） |
| 配色 | 强调色（驱动按钮、链接、选中态），深色主题自动提亮 |
| 界面 | 统一遮罩浓度 0–100%：界面底色统一清成透明，只留一层遮罩盖在壁纸上；部分自带底色的区块会保留一圈细边框以便辨认 |

所有改动实时生效，自动保存在本机浏览器。

## 安装

插件管理器支持四种来源（本地绝对路径、git 仓库、tarball、npm 包名），推荐用 git：

```
设置 → 插件 → 添加插件 → 粘贴仓库地址
https://github.com/oi9-12/harness-view-studio
```

也接受 pnpm 的简写：`github:oi9-12/harness-view-studio`。

其他方式：

- **npm**（如果发布过）：填 `dsh-view-studio`
- **本地目录**：填插件的绝对路径，例如 `D:\plugins\dsh-view-studio`
- **tarball**：`pnpm pack` 出来的 `.tgz` 绝对路径或 https 地址

装完后**完全退出并重新启动 DSH**（不是只刷新页面），侧边栏底部会多出一个滑块图标。

> 为什么必须重启：宿主进程会缓存模块解析路径。首次安装、更换安装来源（例如从本地目录换成 git）、或升级版本后，只刷新页面可能出现「包元信息错误」或「failed to import」——重启一次即可，之后正常使用不需要再重启。

### 网络受限时

插件页在添加 GitHub 来源前会做一次 5 秒连通性探测。如果你的网络需要代理才能访问 GitHub：

- 探测超时不影响真正的安装：点弹窗里的「**试试其他方式**」改用**本地路径 / tarball / npm**；
- 或者给 **git** 单独配置代理（插件管理器用 git 拉取代码）：
  ```powershell
  git config --global http.proxy  http://127.0.0.1:10808
  git config --global https.proxy http://127.0.0.1:10808
  ```
  端口按你本地代理软件的实际 HTTP 端口填。

## 使用

点侧边栏的「视图工作室」图标 → 主区域打开面板：

1. 「背景」里选图、粘图或选视频；
2. 「背景效果」调模糊/亮度/饱和度/暗化；
3. 「界面质感」拉低透明度，让壁纸透出来（0% 完全遮住，100% 完全透出）；
4. 想让整体色调一致，就把透明度调到 40%–70% 之间，配一点暗化。

## 数据存在哪

- 参数与图片：`localStorage` 的 `dsh.view-studio.v1`
- 视频本体：`IndexedDB` 的 `dsh-view-studio` → `files`

两者都按「协议 + 主机 + 端口」隔离。换电脑、换 profile、端口变化都会读不到，需要重新选一次素材。

## 开发

```
dsh-view-studio/
├── package.json        # dsh.bundle.patch + dsh.client 声明
├── cordis.patch.yml    # 往 profile 插入一行
├── index.js            # Host 半侧（空实现，Loader 需要一个可解析的入口）
├── client.js           # 全部逻辑：面板 UI、壁纸/视频引擎、DOM 归一化
├── locale/en.json      # 插件列表里的标题与描述
├── locale/zh.json
└── icon.svg
```

改完 `client.js` 必须 **先移除再安装**（浏览器模块按 id 缓存，直接覆盖不会生效），再重启 DSH：

```
plugin_manager remove_bundle  dsh-view-studio
plugin_manager install_bundle <插件绝对路径或 git 地址>
```

只刷新页面时，宿主仍可能持有旧的模块解析路径，表现是「包元信息错误」或「failed to import」；重启一次即可。

## 已知限制

- 视频壁纸静音：浏览器只允许静音视频自动播放，所以视频没有声音。
- 只在 `web` 平台（`dsh.client.platform`）注册。
- Windows 原生标题栏按钮区属于窗口材质，网页层改不到；其余区域已统一。
- 依赖 DSH 外壳的几个内部结构（`.mP3x-q_frame`、`sidebarCol` 等）。找不到时会降级到 `body` 图层，功能仍在，但标题栏可能对不齐。

## License

MIT
