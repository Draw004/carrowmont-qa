import fs from 'node:fs';
import path from 'node:path';

// SECOPS1. Conservative, high-confidence public-source hygiene checks.
// This checks the current working tree, not Git history, live server responses,
// actual Supabase isolation, browser network traffic or untracked local files.
// Do not output any matching token contents. Public client keys are allowed.
const ignoredDirectories = new Set(['.git', 'node_modules']);
const scanTextExtension = /\.(?:html?|css|js|mjs|cjs|json|md|txt|ya?ml|xml|sql|sh|bat|ts|tsx|env|ini|cfg|toml|properties)$/i;
const scanTextName = new Set(['.gitignore', '.gitattributes', 'robots.txt', 'CNAME']);
const unsafePathRules = [
  {label:'unreviewed environment file', re:/(?:^|\/)\.env(?:\.(?!example$|sample$)[^/]+)?$/i},
  {label:'private key or certificate container',re:/(?:^|\/)[^/]+\.(?:pem|key|p12|pfx|jks|keystore|private-key|secret-key)$/i},
  {label:'private SSH key',re:/(?:^|\/)(?:id_rsa|id_dsa|id_ed25519|id_ecdsa)$/i},
  {label:'local database file',re:/(?:^|\/)[^/]+\.(?:sqlite|sqlite3|db)$/i},
  {label:'service-account credential file',re:/(?:^|\/)[^/]*(?:service[-_]account|service[-_]role)[^/]*\.json$/i}
];
const highConfidenceTokenPatterns = [
  ['private key block', /-----BEGIN (?:RSA |EC |OPENSSH |DSA |ENCRYPTED )?PRIVATE KEY-----|-----BEGIN PGP PRIVATE KEY BLOCK-----/],
  ['GitHub token', /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{64,})\b/],
  ['AWS access key', /\bAKIA[0-9A-Z]{16}\b/],
  ['Stripe secret key', /\bsk_live_[A-Za-z0-9]{24,}\b/],
  ['SendGrid API key', /\bSG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{40,}\b/],
  ['Slack access token', /\bxox[baprs]-[A-Za-z0-9-]{32,}\b/],
];

const isPublicExample = rel => /(?:^|\/)\.env\.(?:example|sample)$/i.test(rel);
const fileClass = rel => {
  if (isPublicExample(rel)) return null;
  return unsafePathRules.find(x=>x.re.test(rel))?.label || null;
};

function hasPrivilegedJwt(text) {
  const candidate=/\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{16,}\b/g;
  for (const m of text.matchAll(candidate)) {
    try {
      const middle=m[0].split('.')[1];
      const obj=JSON.parse(Buffer.from(middle, 'base64url').toString('utf8'));
      if (['service_role', 'supabase_admin', 'postgres'].includes(obj.role)) return true;
    } catch { /* Other base64 strings are not a secret by this rule. */ }
  }
  return false;
}

export function inspectPublicSource(siteRoot) {
  const issues=[];
  if (!fs.existsSync(siteRoot)) return [{rule:'website directory missing',path:'.'}];
  const visit=(dir)=>{
    for (const item of fs.readdirSync(dir,{withFileTypes:true})) {
      if(item.isSymbolicLink()) continue;
      const full=path.join(dir,item.name);
      const rel=path.relative(siteRoot,full).split(path.sep).join('/');
      if(item.isDirectory()) {
        if(!ignoredDirectories.has(item.name)) visit(full);
        continue;
      }
      if(!item.isFile()) continue;
      const badName=fileClass(rel);
      if(badName) issues.push({rule:badName,path:rel});
      if(!scanTextName.has(item.name) && !scanTextExtension.test(item.name)) continue;
      const stat=fs.statSync(full);
      if(stat.size > 2*1024*1024) continue; // Small source files; large archives need separate review.
      const body=fs.readFileSync(full,'utf8');
      for (const [label,regex] of highConfidenceTokenPatterns) {
        if(regex.test(body)) issues.push({rule:label,path:rel});
      }
      if(hasPrivilegedJwt(body)) issues.push({rule:'privileged JWT payload',path:rel});
    }
  };
  visit(siteRoot);
  return issues;
}

export function runPublicSourceHygieneContract(sourceRoot) {
  const site=path.join(sourceRoot,'draw004.github.io');
  const ignorePath=path.join(site,'.gitignore');
  const exists=fs.existsSync(ignorePath);
  const ignore=exists?fs.readFileSync(ignorePath,'utf8'):'';
  const required=['.env','*.pem','*.key','*.p12','*.pfx','*.sqlite','id_rsa','id_ed25519'];
  const missing=required.filter(x=>!ignore.split(/\r?\n/).includes(x));
  const findings=inspectPublicSource(site);
  return [
    {name:'public website has a local secret-file staging guard',ok:exists && missing.length===0,detail:missing.length ? 'missing required .gitignore patterns' : ''},
    {name:'no high-confidence private credentials or secret files in current public website source',ok:findings.length===0,detail:findings.length ? findings.map(x=>`${x.path} (${x.rule})`).join('; ').slice(0,900):''}
  ];
}
