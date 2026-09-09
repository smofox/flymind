export const MM_VIEW_TYPE = 'mindmap';
export const MD_VIEW_TYPE = 'markdown'; 

// https://regex101.com/r/gw85cc/2
export const INTERNAL_LINK_REGEX = /\[\[(?<wikitext>[^\]\n]+)\]\]|<a href="(?<mdpath>[^"]*)">(?<mdtext>[\s\S]*?)<\/a>/g;

// https://regex101.com/r/Yg7HuO/2
export const FRONT_MATTER_REGEX = /^(---)$.+?^(---)$.+?/ims;