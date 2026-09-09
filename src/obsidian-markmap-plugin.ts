import { MindNode as INode } from './node-types';
import { safeHTML } from './safe-html';
import { getLinkpath, Vault } from 'obsidian';
import { INTERNAL_LINK_REGEX } from './constants';

export default class ObsidianMarkmap {
    vaultName: string;

    constructor(vault: Vault) {
        this.vaultName = vault.getName();
    }

    updateInternalLinks(node: INode) {
        this.replaceInternalLinks(node);
        node.v = safeHTML(node.v);
        if(node.c){
            node.c.forEach(n => this.updateInternalLinks(n));
        }
    }

    private replaceInternalLinks(node: INode){
        const matches = this.parseValue(node.v);
        for (let i = 0; i < matches.length; i++) {
            const match = matches[i];
            const groups = match.groups || {};
            const isWikiLink = groups['wikitext'];
            const linkText = isWikiLink ? groups['wikitext'] : groups['mdtext'];
            const linkPath = isWikiLink ? linkText : groups['mdpath'];
            if (!linkText || !linkPath) continue;
            if(linkPath.startsWith('http')){
                continue;
            }
            const url = `obsidian://open?vault=${encodeURIComponent(this.vaultName)}&file=${encodeURIComponent(isWikiLink ? getLinkpath(linkPath) : linkPath)}`;
            const anchor = createEl('a');
            anchor.setAttribute('href', url);
            anchor.textContent = linkText;
            const link = anchor.outerHTML;
            node.v = node.v.replace(match[0], link);
        }
    }

    private parseValue(v: string) {
        const matches: RegExpExecArray[] = [];
        let match = INTERNAL_LINK_REGEX.exec(v);
        while (match !== null) {
            matches.push(match);
            match = INTERNAL_LINK_REGEX.exec(v);
        }
        return matches;
    }

}
