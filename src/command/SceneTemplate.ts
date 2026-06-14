/**
 * 场景模板引擎
 *
 * 将用户说的场景关键词（如"日出"、"城市"）展开为多条绘制命令。
 * 场景模板是确定性的本地展开，不经过 AI。
 */

import type { Command } from './types';

export interface SceneTemplate {
  name: string;
  keywords: string[];
  commands: Omit<Command, 'raw'>[];
}

export const SCENE_TEMPLATES: Record<string, SceneTemplate> = {
  sunrise: {
    name: '日出',
    keywords: ['日出', '日出风景', '朝阳', '晨曦'],
    commands: [
      { intent: 'draw', params: { shape: 'circle', color: 'yellow', size: 'large', position: 'top-center', semanticName: 'sun' } },
      { intent: 'draw', params: { shape: 'triangle', color: 'green', size: 'large', position: 'bottom-left', semanticName: 'mountain' } },
      { intent: 'draw', params: { shape: 'triangle', color: 'green', size: 'large', position: 'bottom-right', semanticName: 'mountain' } },
      { intent: 'draw', params: { shape: 'line', color: 'blue', position: 'bottom-center', semanticName: 'river' } },
    ],
  },
  landscape: {
    name: '风景',
    keywords: ['风景', '风景画', '山水画'],
    commands: [
      { intent: 'draw', params: { shape: 'circle', color: 'yellow', size: 'large', position: 'top-right', semanticName: 'sun' } },
      { intent: 'draw', params: { shape: 'triangle', color: 'green', size: 'large', position: 'bottom-left', semanticName: 'mountain' } },
      { intent: 'draw', params: { shape: 'line', color: 'blue', position: 'bottom-center', semanticName: 'river' } },
      { intent: 'draw', params: { shape: 'triangle', color: 'green', size: 'medium', position: 'center-left', semanticName: 'tree' } },
      { intent: 'draw', params: { shape: 'circle', color: 'white', size: 'medium', position: 'top-left', semanticName: 'cloud' } },
    ],
  },
  mountains: {
    name: '山水',
    keywords: ['山水', '山水风景', '高山', '远山'],
    commands: [
      { intent: 'draw', params: { shape: 'triangle', color: 'green', size: 'large', position: 'bottom-left', semanticName: 'mountain' } },
      { intent: 'draw', params: { shape: 'triangle', color: 'green', size: 'large', position: 'bottom-center', semanticName: 'mountain' } },
      { intent: 'draw', params: { shape: 'triangle', color: 'green', size: 'large', position: 'bottom-right', semanticName: 'mountain' } },
      { intent: 'draw', params: { shape: 'line', color: 'blue', position: 'bottom-center', semanticName: 'river' } },
      { intent: 'draw', params: { shape: 'circle', color: 'yellow', size: 'large', position: 'top-center', semanticName: 'sun' } },
    ],
  },
  city: {
    name: '城市',
    keywords: ['城市', '都市', '城市风景', '建筑群'],
    commands: [
      { intent: 'draw', params: { shape: 'rect', color: 'brown', size: 'large', position: 'center-left', semanticName: 'house' } },
      { intent: 'draw', params: { shape: 'rect', color: 'brown', size: 'medium', position: 'center', semanticName: 'house' } },
      { intent: 'draw', params: { shape: 'rect', color: 'brown', size: 'large', position: 'center-right', semanticName: 'house' } },
      { intent: 'draw', params: { shape: 'rect', color: 'gray', size: 'medium', position: 'bottom-left', semanticName: 'house' } },
      { intent: 'draw', params: { shape: 'circle', color: 'yellow', size: 'medium', position: 'top-right', semanticName: 'sun' } },
    ],
  },
  flowchart: {
    name: '流程图',
    keywords: ['流程图', '流程', '结构图', '框图'],
    commands: [
      { intent: 'draw', params: { shape: 'rect', color: 'blue', size: 'small', position: 'top-center' } },
      { intent: 'draw', params: { shape: 'rect', color: 'blue', size: 'small', position: 'center' } },
      { intent: 'draw', params: { shape: 'rect', color: 'blue', size: 'small', position: 'bottom-center' } },
      { intent: 'draw', params: { shape: 'line', color: 'gray', position: 'center' } },
    ],
  },
  smiley: {
    name: '笑脸',
    keywords: ['笑脸', '笑', '笑脸图', '表情'],
    commands: [
      { intent: 'draw', params: { shape: 'circle', color: 'yellow', size: 'large', position: 'center' } },
      { intent: 'draw', params: { shape: 'circle', color: 'black', size: 'small', position: 'center-left' } },
      { intent: 'draw', params: { shape: 'circle', color: 'black', size: 'small', position: 'center-right' } },
    ],
  },
  sunset: {
    name: '日落',
    keywords: ['日落', '晚霞', '夕阳', '黄昏'],
    commands: [
      { intent: 'draw', params: { shape: 'circle', color: 'orange', size: 'large', position: 'bottom-center', semanticName: 'sun' } },
      { intent: 'draw', params: { shape: 'triangle', color: 'green', size: 'large', position: 'bottom-left', semanticName: 'mountain' } },
      { intent: 'draw', params: { shape: 'triangle', color: 'green', size: 'large', position: 'bottom-right', semanticName: 'mountain' } },
      { intent: 'draw', params: { shape: 'circle', color: 'pink', size: 'small', position: 'top-left', semanticName: 'cloud' } },
    ],
  },
  flowerField: {
    name: '花海',
    keywords: ['花海', '花田', '花园', '花丛'],
    commands: [
      { intent: 'draw', params: { shape: 'circle', color: 'pink', size: 'small', position: 'bottom-left', semanticName: 'flower' } },
      { intent: 'draw', params: { shape: 'circle', color: 'pink', size: 'small', position: 'bottom-center', semanticName: 'flower' } },
      { intent: 'draw', params: { shape: 'circle', color: 'pink', size: 'small', position: 'bottom-right', semanticName: 'flower' } },
      { intent: 'draw', params: { shape: 'circle', color: 'yellow', size: 'small', position: 'center-left', semanticName: 'flower' } },
      { intent: 'draw', params: { shape: 'circle', color: 'yellow', size: 'small', position: 'center', semanticName: 'flower' } },
      { intent: 'draw', params: { shape: 'circle', color: 'yellow', size: 'small', position: 'center-right', semanticName: 'flower' } },
    ],
  },
  starryNight: {
    name: '星空',
    keywords: ['星空', '星星', '夜空', '夜晚'],
    commands: [
      { intent: 'draw', params: { shape: 'circle', color: 'yellow', size: 'small', position: 'top-left' } },
      { intent: 'draw', params: { shape: 'circle', color: 'yellow', size: 'small', position: 'top-center' } },
      { intent: 'draw', params: { shape: 'circle', color: 'yellow', size: 'small', position: 'top-right' } },
      { intent: 'draw', params: { shape: 'circle', color: 'white', size: 'small', position: 'center-left' } },
      { intent: 'draw', params: { shape: 'circle', color: 'white', size: 'small', position: 'center-right' } },
      { intent: 'draw', params: { shape: 'circle', color: 'yellow', size: 'small', position: 'center' } },
      { intent: 'draw', params: { shape: 'rect', color: 'brown', size: 'medium', position: 'bottom-center', semanticName: 'house' } },
    ],
  },
};

/** 按关键词查找场景模板 key */
export function lookupScene(text: string): string | null {
  for (const [key, template] of Object.entries(SCENE_TEMPLATES)) {
    for (const kw of template.keywords) {
      if (text.includes(kw)) return key;
    }
  }
  return null;
}

/** 将场景模板展开为完整 Command 列表 */
export function expandSceneTemplate(sceneKey: string): Command[] {
  const template = SCENE_TEMPLATES[sceneKey];
  if (!template) return [];
  return template.commands.map((entry) => ({
    intent: entry.intent as Command['intent'],
    raw: `scene:${template.name}`,
    params: entry.params ? { ...entry.params } : undefined,
  }));
}

/** 获取所有场景关键词（用于快速通路正则） */
export function getSceneKeywords(): string[] {
  const keywords: string[] = [];
  for (const template of Object.values(SCENE_TEMPLATES)) {
    keywords.push(...template.keywords);
  }
  return keywords;
}
