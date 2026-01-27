import { createCssUtils } from "@real1ty-obsidian-plugins";
import { CSS_PREFIX } from "../constants";

export const { cls, addCls, removeCls, toggleCls, hasCls } =
  createCssUtils(CSS_PREFIX);
