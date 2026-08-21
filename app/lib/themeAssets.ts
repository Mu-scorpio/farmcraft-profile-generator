export const FARM_ASSETS = {
  village: "/assets/farm/village-town.png",
  soil: "/assets/farm/sprites/soil.png",
  pumpkin: "/assets/farm/sprites/pumpkin.png",
  sunflower: "/assets/farm/sprites/sunflower.png",
  shovel: "/assets/farm/sprites/shovel.png",
  sprouts: "/assets/farm/sprites/sprouts.png",
  watering: "/assets/farm/sprites/watering.png",
  fence: "/assets/farm/sprites/fence.png",
  wheat: "/assets/farm/sprites/wheat.png",
  scarecrow: "/assets/farm/sprites/scarecrow.png",
  greenhouse: "/assets/farm/sprites/greenhouse.png",
} as const;

/**
 * User-provided repository card artwork. The source files are kept under
 * /assets for editing, while the same named files are copied to public for
 * browser previews and SVG generation.
 */
export const REPO_CARD_ASSETS = {
  frame: "/assets/repo-card/repo-card-frame.png",
  hero: "/assets/repo-card/repo-card-hero-chest.png",
  iconStar: "/assets/repo-card/repo-card-icon-star.png",
  iconFork: "/assets/repo-card/repo-card-icon-fork.png",
  iconOrb: "/assets/repo-card/repo-card-icon-orb.png",
  iconGears: "/assets/repo-card/repo-card-icon-gears.png",
  iconTag: "/assets/repo-card/repo-card-icon-tag.png",
  iconChest: "/assets/repo-card/repo-card-icon-chest.png",
  heroController: "/assets/repo-card/repo-card-hero-controller.png",
  heroGears: "/assets/repo-card/repo-card-hero-gears.png",
  heroBrain: "/assets/repo-card/repo-card-hero-brain.png",
  badgeToolbox: "/assets/repo-card/repo-card-badge-toolbox.png",
  badgeBricks: "/assets/repo-card/repo-card-badge-bricks.png",
  badgePouch: "/assets/repo-card/repo-card-badge-pouch.png",
  badgeSword: "/assets/repo-card/repo-card-badge-sword.png",
  iconBrain: "/assets/repo-card/repo-card-icon-brain.png",
  iconController: "/assets/repo-card/repo-card-icon-controller.png",
} as const;

export const REPO_CARD_RENDER_ASSET_KEYS = [
  "frame",
  "hero",
  "heroController",
  "heroGears",
  "heroBrain",
  "badgeToolbox",
  "badgeBricks",
  "badgePouch",
  "badgeSword",
  "star",
  "fork",
  "language",
  "activity",
  "issues",
  "size",
  "brain",
  "controller",
] as const;

export const REPO_CARD_ASSET_SOURCES = {
  frame: REPO_CARD_ASSETS.frame,
  hero: REPO_CARD_ASSETS.hero,
  heroController: REPO_CARD_ASSETS.heroController,
  heroGears: REPO_CARD_ASSETS.heroGears,
  heroBrain: REPO_CARD_ASSETS.heroBrain,
  badgeToolbox: REPO_CARD_ASSETS.badgeToolbox,
  badgeBricks: REPO_CARD_ASSETS.badgeBricks,
  badgePouch: REPO_CARD_ASSETS.badgePouch,
  badgeSword: REPO_CARD_ASSETS.badgeSword,
  star: REPO_CARD_ASSETS.iconStar,
  fork: REPO_CARD_ASSETS.iconFork,
  language: REPO_CARD_ASSETS.iconOrb,
  activity: REPO_CARD_ASSETS.iconGears,
  issues: REPO_CARD_ASSETS.iconTag,
  size: REPO_CARD_ASSETS.iconChest,
  brain: REPO_CARD_ASSETS.iconBrain,
  controller: REPO_CARD_ASSETS.iconController,
} as const;

export const FARM_PALETTE = {
  forest: "#16392d",
  spruce: "#28533d",
  leaf: "#4f7f3d",
  leafLight: "#78a653",
  paper: "#f4e5bf",
  paperDark: "#d2b77e",
  ink: "#2e241d",
  soil: "#a86848",
  soilLight: "#c5885b",
  water: "#3d8c96",
  waterLight: "#72c1b5",
  gold: "#e5ad4b",
  berry: "#c86662",
} as const;
