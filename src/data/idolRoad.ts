/** 全アイドルの累計星数に応じたEXP報酬を管理し、ステージ数などの仕様値はconstantへ分ける */
import type { AchievementMilestone } from '../types/achievementCalculator'

/** 累計星数に応じて獲得するプロデューサーEXP */
export const IDOL_ROAD_REWARD_MILESTONES: readonly AchievementMilestone[] = [
  {
    threshold: 10,
    exp: 3000,
  },
  {
    threshold: 20,
    exp: 3000,
  },
  {
    threshold: 30,
    exp: 3000,
  },
  {
    threshold: 40,
    exp: 3000,
  },
  {
    threshold: 60,
    exp: 3000,
  },
  {
    threshold: 70,
    exp: 3000,
  },
  {
    threshold: 80,
    exp: 3000,
  },
  {
    threshold: 90,
    exp: 3000,
  },
  {
    threshold: 110,
    exp: 3000,
  },
  {
    threshold: 120,
    exp: 3000,
  },
  {
    threshold: 130,
    exp: 3000,
  },
  {
    threshold: 140,
    exp: 3000,
  },
  {
    threshold: 160,
    exp: 3000,
  },
  {
    threshold: 170,
    exp: 3000,
  },
  {
    threshold: 180,
    exp: 3000,
  },
  {
    threshold: 190,
    exp: 3000,
  },
  {
    threshold: 210,
    exp: 3000,
  },
  {
    threshold: 220,
    exp: 3000,
  },
  {
    threshold: 230,
    exp: 3000,
  },
  {
    threshold: 240,
    exp: 3000,
  },
  {
    threshold: 250,
    exp: 3000,
  },
  {
    threshold: 260,
    exp: 3000,
  },
  {
    threshold: 270,
    exp: 3000,
  },
  {
    threshold: 280,
    exp: 3000,
  },
  {
    threshold: 290,
    exp: 3000,
  },
  {
    threshold: 310,
    exp: 3000,
  },
  {
    threshold: 320,
    exp: 3000,
  },
  {
    threshold: 330,
    exp: 3000,
  },
  {
    threshold: 340,
    exp: 3000,
  },
  {
    threshold: 350,
    exp: 3000,
  },
  {
    threshold: 360,
    exp: 3000,
  },
  {
    threshold: 370,
    exp: 3000,
  },
  {
    threshold: 380,
    exp: 3000,
  },
  {
    threshold: 390,
    exp: 3000,
  },
  {
    threshold: 400,
    exp: 10000,
  },
  {
    threshold: 410,
    exp: 3000,
  },
  {
    threshold: 420,
    exp: 3000,
  },
  {
    threshold: 430,
    exp: 3000,
  },
  {
    threshold: 440,
    exp: 3000,
  },
  {
    threshold: 450,
    exp: 3000,
  },
  {
    threshold: 460,
    exp: 3000,
  },
  {
    threshold: 470,
    exp: 3000,
  },
  {
    threshold: 480,
    exp: 3000,
  },
  {
    threshold: 490,
    exp: 3000,
  },
  {
    threshold: 510,
    exp: 3000,
  },
  {
    threshold: 520,
    exp: 3000,
  },
  {
    threshold: 530,
    exp: 3000,
  },
  {
    threshold: 540,
    exp: 3000,
  },
  {
    threshold: 550,
    exp: 3000,
  },
  {
    threshold: 560,
    exp: 3000,
  },
  {
    threshold: 570,
    exp: 3000,
  },
  {
    threshold: 580,
    exp: 3000,
  },
  {
    threshold: 590,
    exp: 3000,
  },
  {
    threshold: 600,
    exp: 10000,
  },
  {
    threshold: 610,
    exp: 3000,
  },
  {
    threshold: 620,
    exp: 3000,
  },
  {
    threshold: 630,
    exp: 3000,
  },
  {
    threshold: 640,
    exp: 3000,
  },
  {
    threshold: 650,
    exp: 3000,
  },
  {
    threshold: 660,
    exp: 3000,
  },
  {
    threshold: 670,
    exp: 3000,
  },
  {
    threshold: 680,
    exp: 3000,
  },
  {
    threshold: 690,
    exp: 3000,
  },
  {
    threshold: 700,
    exp: 10000,
  },
  {
    threshold: 710,
    exp: 3000,
  },
  {
    threshold: 720,
    exp: 3000,
  },
  {
    threshold: 730,
    exp: 3000,
  },
  {
    threshold: 740,
    exp: 3000,
  },
  {
    threshold: 750,
    exp: 3000,
  },
  {
    threshold: 760,
    exp: 3000,
  },
  {
    threshold: 770,
    exp: 3000,
  },
  {
    threshold: 780,
    exp: 3000,
  },
  {
    threshold: 790,
    exp: 3000,
  },
  {
    threshold: 800,
    exp: 10000,
  },
  {
    threshold: 810,
    exp: 3000,
  },
  {
    threshold: 820,
    exp: 3000,
  },
  {
    threshold: 830,
    exp: 3000,
  },
  {
    threshold: 840,
    exp: 3000,
  },
  {
    threshold: 850,
    exp: 3000,
  },
  {
    threshold: 860,
    exp: 3000,
  },
  {
    threshold: 870,
    exp: 3000,
  },
  {
    threshold: 880,
    exp: 3000,
  },
  {
    threshold: 890,
    exp: 3000,
  },
  {
    threshold: 910,
    exp: 3000,
  },
  {
    threshold: 920,
    exp: 3000,
  },
  {
    threshold: 930,
    exp: 3000,
  },
  {
    threshold: 940,
    exp: 3000,
  },
  {
    threshold: 950,
    exp: 3000,
  },
  {
    threshold: 960,
    exp: 3000,
  },
  {
    threshold: 970,
    exp: 3000,
  },
  {
    threshold: 980,
    exp: 3000,
  },
  {
    threshold: 990,
    exp: 3000,
  },
  {
    threshold: 1000,
    exp: 10000,
  },
  {
    threshold: 1010,
    exp: 3000,
  },
  {
    threshold: 1020,
    exp: 3000,
  },
  {
    threshold: 1030,
    exp: 3000,
  },
  {
    threshold: 1040,
    exp: 3000,
  },
  {
    threshold: 1050,
    exp: 3000,
  },
]
