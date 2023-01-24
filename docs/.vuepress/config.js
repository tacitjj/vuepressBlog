module.exports = {
    plugins: ['fulltext-search', //搜索
        //播放器
        ['@vuepress-reco/vuepress-plugin-bgm-player',
            {
                audios: [
                    {
                        name: 'LOSER',
                        artist: '米津玄師',
                        url: 'https://cdn.jsdelivr.net/gh/tacitjj/picture/image/loser.m4a',
                        cover: 'https://p1.music.126.net/qTSIZ27qiFvRoKj-P30BiA==/109951165895951287.jpg?param=200y200'
                    },
                    {
                        name: '打上花火(动画电影《升空的焰火，从下面看还是从侧面看?》主题曲)',
                        artist: 'Daoko / 米津玄師',
                        url: 'https://cdn.jsdelivr.net/gh/tacitjj/picture/image/202301201412062.m4a',
                        cover: 'https://cdn.jsdelivr.net/gh/tacitjj/picture/image/202301201410552.jpg'
                    },
                ],
                position: {
                    left: '10px',
                    bottom: '10px',
                    'z-index': '999999'
                },
                autoShrink: true,
                floatPosition: 'left',
                floatStyle: {
                    bottom: '80px',
                    'z-index': '999999'
                }
            }
        ],
        //光标
        ['cursor-effects', {
            size: 2, // size of the particle, default: 2
            shape: 'star', // ['star' | 'circle'], // shape of the particle, default: 'star'
            zIndex: 999999999, // z-index property of the canvas, default: 999999999
        }],
        // [
        //     "vuepress-plugin-nuggets-style-copy",
        //     {
        //         copyText: "复制代码",
        //         tip: {
        //             content: "复制成功",
        //         },
        //     },
        // ],  //不知道为什么 使用reco这个就会报错
        // 代码复制
        ['vuepress-plugin-code-copy', true],
    ],
    title: 'lailai\'s blog',
    description: '我的个人网站',
    head: [ // 注入到当前页面的 HTML <head> 中的标签
        ['link', {rel: 'icon', href: '/images/photo.jpg'}],
        ['link', {rel: 'manifest', href: '/images/photo.jpg'}],
        ['link', {rel: 'apple-touch-icon', href: '/images/photo.jpg'}],
        ['meta', {'http-quiv': 'pragma', cotent: 'no-cache'}],
        ['meta', {'http-quiv': 'expires', cotent: '0'}],
        ['meta', {'http-quiv': 'pragma', cotent: 'no-cache, must-revalidate'}],
        // 引入自定义js
        ['script', {'language': 'javascript', 'type': 'text/javascript', 'src': '/js/pgmanor-self.js'}]
    ],
    serviceWorker: true, // 是否开启 PWA
    base: '/', // 部署到github相关的配置
    markdown: {
        lineNumbers: true // 代码块是否显示行号
    },
    theme: 'reco',
    themeConfig: {
        // author
        author: 'lailai',
        // 侧边栏
        sidebar: 'auto',
        // music: 'httpssss://music.163.com/song?id=1330348068&userid=119185110',// 链接
        sidebarDepth: 2,
        subSidebar: 'auto', //在所有页面中启用自动生成子侧边栏，原sidebar仍然兼容
        nav: [ // 导航栏配置
            {
                text: '后端基础', ariaLabel: '这是提示语',
                items: [
                    {text: '笔记', link: '/basic/1'}, // 可不写后缀 .md
                    {text: '工具类', link: '/utils/分布式锁工具类.md'}, // 可不写后缀 .md
                    {text: '其它链接', link: 'https://www.baidu.com/'}// 外部链接
                ]
            },
            {text: '其他', link: '/others/'},
            {text: 'Github', link: 'https://github.com/tacitjj'}
        ],
        // 博客配置
        blogConfig: {
            category: {
                location: 2, // 在导航栏菜单中所占的位置，默认2
                text: "分类", // 默认文案 “分类”
            },
            tag: {
                location: 3,     // 在导航栏菜单中所占的位置，默认3
                text: 'Tag'      // 默认文案
            },
        },
        // 在sidebar配置侧导航栏
        sidebar: { // 侧边栏配置
            '/basic/': [
                {
                    title: '后端基础',
                    children: [
                        ['/basic/1.md', "首页"],
                        ['/basic/hashmap.md', "HashMap详解"],
                        ['/basic/JDK 1.8 内存结构.md', "JDK 1.8 内存结构"],
                        ['/basic/2.html',"这个还不知道写什么"],

                    ]
                }
            ],
            '/advanced/': [
                {
                    title: '进阶之路',
                    children: [
                        '/advanced/1.html'
                    ]
                }
            ],
            '/interview/': [
                {
                    title: '面试题合集',
                    children: [
                        '/interview/1.html'
                    ]
                }
            ],
            '/others/': [
                {
                    title: '诗和远方',
                    children: [
                        "/others/2",
                        ["/others/1", "手动设置侧标了title"],
                        ["/others/2", "手动设置侧标了title2"]
                    ]
                }
            ],
            '/utils/': [
                {
                    title: '工具类',
                    children: [
                        ["/utils/分布式锁工具类", "分布式锁工具类"],
                        ["/utils/文件压缩打包工具类", "文件压缩打包工具类"],
                        ["/utils/DateUtil", "线程安全DateUtil"]
                    ]
                }
            ],
        }
    }
};




