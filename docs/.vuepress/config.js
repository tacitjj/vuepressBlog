module.exports = {
    title: 'lailai\'s blog',
    description: '我的个人网站',
    head: [ // 注入到当前页面的 HTML <head> 中的标签
      ['link', { rel: 'icon', href: '/images/photo.jpg' }],
      ['link', { rel: 'manifest', href: '/images/photo.jpg' }],
      ['link', { rel: 'apple-touch-icon', href: '/images/photo.jpg' }],
      ['meta', { 'http-quiv': 'pragma', cotent: 'no-cache'}],
      ['meta', { 'http-quiv': 'expires', cotent: '0'}],
      ['meta', { 'http-quiv': 'pragma', cotent: 'no-cache, must-revalidate'}]
    ],
    serviceWorker: true, // 是否开启 PWA
    base: '/', // 部署到github相关的配置
    markdown: {
      lineNumbers: true // 代码块是否显示行号
    },
    themeConfig: {
      nav:[ // 导航栏配置
        {text: '后端基础', link: '/accumulate/' },
        {text: '算法题库', link: '/algorithm/'},
        {text: 'Github', link: 'https://baidu.com'}      
      ],
    // 在sidebar配置侧导航栏
    sidebar:{ // 侧边栏配置
      '/basic/': [
          {
            title: '前端基础',
            children: [
              '/basic/1.html',
              '/basic/2.html',
              '/basic/3.html',
              '/basic/4.html',
              '/basic/5.html',
              '/basic/6.html',
              '/basic/7.html',
              '/basic/8.html',
              '/basic/9.html',
              '/basic/10.html',
              '/basic/11.html',
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
      '/engineering/': [
        {
          title: '模块化',
          children: [
            '/engineering/规范化/commit',
          ]
        }, {
          title: '组件化'
        }, {
          title: '自动化'
        }, {
          title: '规范化',
          children: [
            '/engineering/规范化/commit'
          ]
        }
      ],
      '/others/': [
        {
          title: '诗和远方',
          children: [
            '/others/1.html'
          ]
        }
      ],
    }
    }
  };
