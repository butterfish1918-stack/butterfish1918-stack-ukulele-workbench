/** Tests real MusicXML bytes using Python ElementTree's XML parser, adapted to
 * the small DOM API consumed by the application. No network or npm packages. */
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const runner=fileURLToPath(new URL('./xml_dom_adapter.py',import.meta.url));
function node(raw){
 const children=(raw.children||[]).map(node);
 return {
  tagName:raw.tag,children,
  getAttribute:k=>Object.hasOwn(raw.attrs,k)?raw.attrs[k]:null,
  hasAttribute:k=>Object.hasOwn(raw.attrs,k),
  get firstElementChild(){return children[0]??null},
  get textContent(){return (raw.text||'')+
   children.map((child,i)=>child.textContent+(raw.children[i].tail||'')).join('')},
  getElementsByTagName(name){
   return children.flatMap(child=>[
    ...(child.tagName===name?[child]:[]),...child.getElementsByTagName(name)]);
  }
 };
}
export class RealXmlFixtureParser {
 parseFromString(xml){
  const run=spawnSync('python3',[runner],{input:xml,encoding:'utf8',maxBuffer:6_000_000});
  if(run.error)throw run.error;
  if(run.status!==0)throw Error(run.stderr||'Fixture XML parser failed');
  return {documentElement:node(JSON.parse(run.stdout)),querySelector:()=>null};
 }
}
