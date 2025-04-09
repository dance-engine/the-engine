import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import type * as OpenApiPlugin from "docusaurus-plugin-openapi-docs";

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'Dance Engine API Docs',
  tagline: ' ',
  favicon: 'img/favicon.ico',

  // Set the production url of your site here
  url: 'https://apidocs.danceengine.co.uk',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          docItemComponent: "@theme/ApiItem"
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],
  plugins: [
    [    
      'docusaurus-plugin-openapi-docs',
      {
        id: "api", // plugin id
        docsPluginId: "classic", // configured for preset-classic
        config: {
          core: {
            specPath: "../../functions/openapi.json",
            outputDir: "docs/core",
            sidebarOptions: {
              groupPathsBy: "tag",
              categoryLinkSource: "tag"
            },
            showSchemas: true,
          } satisfies OpenApiPlugin.Options,
       }
      }
    ],
    "@gracefullight/docusaurus-plugin-tailwind"
  ],
  themes: ["docusaurus-theme-openapi-docs", '@docusaurus/theme-mermaid'], // export theme components
  markdown: {
    mermaid: true,
  },


  themeConfig: {
    // Replace with your project's social card
    image: 'img/dance-engine-social-card.png',
    navbar: {
      title: 'Dance Engine Documentation',
      logo: {
        alt: 'Dance Engine Logo',
        src: 'img/logo-light.png',
        srcDark: 'img/logo-dark.png',
        width: 30,
        height:30,
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          type: 'docSidebar',
          sidebarId: 'apirefSidebar',
          position: 'left',
          label: 'Reference',
        },
        {href: 'http://danceengine.awsapps.com/start/#/', label: 'AWS', position: 'right'},
        // {to: '/blog', label: 'Blog', position: 'left'},
        {
          href: 'https://github.com/dance-engine/the-engine',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      logo: {
        alt: 'Dance Engine Logo',
        src: 'img/dance-engine-logo-wide.png',
      },
      links: [
        // {
        //   title: 'Docs',
        //   items: [
        //     {
        //       label: 'Tutorial',
        //       to: '/docs/intro',
        //     },
        //   ],
        // },
      ],
      copyright: `© ${new Date().getFullYear()} Dance Engine. All rights reserved.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
