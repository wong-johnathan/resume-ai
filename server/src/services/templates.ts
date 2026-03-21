import { ResumeContent } from './claude';

function formatDate(d: string | Date | null | undefined): string {
  if (!d) return '';
  const date = new Date(d);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

// ─── Minimal ─────────────────────────────────────────────────────────────────

function minimalTemplate(c: ResumeContent): string {
  const { personalInfo: p, summary, experiences, educations, skills, certifications } = c;
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:9.5pt;color:#222;padding:40px 52px;background:#fff;}
  h1{font-size:22pt;font-weight:300;letter-spacing:-.02em;margin-bottom:4px;}
  .tagline{font-size:8.5pt;color:#888;margin-bottom:6px;}
  .contact-line{font-size:8pt;color:#666;border-bottom:1px solid #e0e0e0;padding-bottom:14px;margin-bottom:20px;}
  .section{margin-bottom:22px;}
  .section-title{font-size:7.5pt;font-weight:600;text-transform:uppercase;letter-spacing:.12em;color:#888;margin-bottom:10px;}
  .exp-title{font-weight:600;font-size:9.5pt;}
  .exp-meta{font-size:8pt;color:#666;margin-bottom:3px;}
  .exp-desc{font-size:8.5pt;line-height:1.6;color:#333;white-space:pre-wrap;}
  .skills-wrap{display:flex;flex-wrap:wrap;gap:6px;}
  .skill-tag{background:#f4f4f4;border-radius:3px;padding:2px 8px;font-size:8pt;color:#333;}
  .divider{border:none;border-top:1px solid #e8e8e8;margin:12px 0;}
</style>
</head><body>
<h1>${p.firstName} ${p.lastName}</h1>
<div class="contact-line">${[p.email,p.phone,p.location,p.linkedinUrl,p.githubUrl,p.portfolioUrl].filter(Boolean).join(' · ')}</div>
${summary ? `<div class="section"><div class="section-title">About</div><div class="exp-desc">${summary}</div></div>` : ''}
${experiences.length ? `<div class="section"><div class="section-title">Experience</div>${experiences.map((e,i) => `
  ${i>0 ? '<hr class="divider">' : ''}
  <div style="margin-bottom:8px">
    <div class="exp-title">${e.title} <span style="font-weight:400;color:#555">· ${e.company}</span></div>
    <div class="exp-meta">${formatDate(e.startDate)} – ${e.isCurrent ? 'Present' : formatDate(e.endDate)}${e.location ? ` · ${e.location}` : ''}</div>
    <div class="exp-desc">${e.description}</div>
  </div>`).join('')}</div>` : ''}
${educations.length ? `<div class="section"><div class="section-title">Education</div>${educations.map(e => `
  <div style="margin-bottom:8px">
    <div class="exp-title">${e.institution}</div>
    <div class="exp-meta">${e.degree}${e.fieldOfStudy ? ` · ${e.fieldOfStudy}` : ''} · ${formatDate(e.endDate)}${e.gpa ? ` · GPA ${e.gpa}` : ''}</div>
  </div>`).join('')}</div>` : ''}
${skills.length ? `<div class="section"><div class="section-title">Skills</div><div class="skills-wrap">${skills.map(s => `<span class="skill-tag">${s.name}</span>`).join('')}</div></div>` : ''}
${certifications.length ? `<div class="section"><div class="section-title">Certifications</div>${certifications.map(c => `<div style="font-size:8.5pt;margin-bottom:3px"><strong>${c.name}</strong> · ${c.issuer}</div>`).join('')}</div>` : ''}
</body></html>`;
}

// ─── Elegant (centered serif header, decorative rules) ───────────────────────

function elegantTemplate(c: ResumeContent): string {
  const { personalInfo: p, summary, experiences, educations, skills, certifications } = c;
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:Georgia,'Times New Roman',serif;font-size:9.5pt;color:#222;padding:36px 52px;background:#fffdf9;}
  .header{text-align:center;margin-bottom:18px;}
  h1{font-size:24pt;font-weight:400;letter-spacing:.08em;text-transform:uppercase;}
  .rule{display:flex;align-items:center;gap:10px;margin:8px 0;}
  .rule::before,.rule::after{content:'';flex:1;border-top:1px solid #bbb;}
  .contact-line{font-size:8pt;color:#666;letter-spacing:.03em;}
  .section{margin-bottom:16px;}
  .section-title{font-size:9pt;font-weight:400;text-transform:uppercase;letter-spacing:.14em;text-align:center;margin-bottom:8px;}
  .section-rule{border:none;border-top:1px solid #ccc;margin-bottom:10px;}
  .exp-header{display:flex;justify-content:space-between;}
  .exp-title{font-weight:700;font-style:italic;font-size:9.5pt;}
  .exp-date{font-size:8pt;color:#666;}
  .exp-company{font-size:9pt;color:#444;margin-bottom:2px;}
  .exp-desc{font-size:8.5pt;line-height:1.6;white-space:pre-wrap;color:#333;}
  .skills-list{text-align:center;font-size:8.5pt;color:#444;line-height:1.8;}
</style></head><body>
<div class="header">
  <h1>${p.firstName} ${p.lastName}</h1>
  <div class="rule"><span class="contact-line">${[p.email,p.phone,p.location,p.linkedinUrl,p.githubUrl,p.portfolioUrl].filter(Boolean).join('  ·  ')}</span></div>
</div>
${summary?`<div class="section"><div class="section-title">Profile</div><hr class="section-rule"><div class="exp-desc" style="text-align:center">${summary}</div></div>`:''}
${experiences.length?`<div class="section"><div class="section-title">Experience</div><hr class="section-rule">${experiences.map(e=>`<div style="margin-bottom:10px"><div class="exp-header"><span class="exp-title">${e.title}</span><span class="exp-date">${formatDate(e.startDate)} – ${e.isCurrent?'Present':formatDate(e.endDate)}</span></div><div class="exp-company">${e.company}${e.location?`, ${e.location}`:''}</div><div class="exp-desc">${e.description}</div></div>`).join('')}</div>`:''}
${educations.length?`<div class="section"><div class="section-title">Education</div><hr class="section-rule">${educations.map(e=>`<div style="margin-bottom:7px"><div class="exp-header"><span class="exp-title">${e.institution}</span><span class="exp-date">${formatDate(e.startDate)} – ${formatDate(e.endDate)}</span></div><div class="exp-company">${e.degree}${e.fieldOfStudy?`, ${e.fieldOfStudy}`:''}${e.gpa?` · GPA ${e.gpa}`:''}</div></div>`).join('')}</div>`:''}
${skills.length?`<div class="section"><div class="section-title">Skills</div><hr class="section-rule"><div class="skills-list">${skills.map(s=>s.name).join(' · ')}</div></div>`:''}
${certifications.length?`<div class="section"><div class="section-title">Certifications</div><hr class="section-rule">${certifications.map(c=>`<div style="text-align:center;font-size:8.5pt;margin-bottom:3px"><strong>${c.name}</strong> · ${c.issuer}</div>`).join('')}</div>`:''}
</body></html>`;
}

// ─── Tech (dark theme, monospace accents) ─────────────────────────────────────

function techTemplate(c: ResumeContent): string {
  const { personalInfo: p, summary, experiences, educations, skills, certifications } = c;
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:'Courier New',Courier,monospace;font-size:8.5pt;color:#e2e8f0;background:#0f172a;padding:32px 40px;}
  h1{font-size:20pt;font-weight:700;color:#38bdf8;letter-spacing:.04em;}
  .contact-line{font-size:7.5pt;color:#64748b;margin-top:5px;margin-bottom:20px;}
  .section{margin-bottom:16px;}
  .section-title{color:#38bdf8;font-size:8.5pt;margin-bottom:8px;}
  .section-title::before{content:'// ';}
  .exp-header{display:flex;justify-content:space-between;}
  .exp-title{font-weight:700;color:#f1f5f9;}
  .exp-date{font-size:7.5pt;color:#475569;}
  .exp-company{font-size:8pt;color:#94a3b8;margin-bottom:3px;}
  .exp-company::before{content:'@ ';}
  .exp-desc{font-size:7.5pt;line-height:1.6;color:#cbd5e1;white-space:pre-wrap;}
  .skill-tag{display:inline-block;background:#1e293b;border:1px solid #334155;color:#7dd3fc;padding:1px 7px;border-radius:3px;font-size:7.5pt;margin:2px 2px 0 0;}
  .divider{border:none;border-top:1px solid #1e293b;margin:12px 0;}
</style></head><body>
  <h1>${p.firstName} ${p.lastName}</h1>
  <div class="contact-line">${[p.email,p.phone,p.location,p.linkedinUrl,p.githubUrl,p.portfolioUrl].filter(Boolean).join(' | ')}</div>
  ${summary?`<div class="section"><div class="section-title">summary</div><div class="exp-desc">${summary}</div></div><hr class="divider">`:''}
  ${experiences.length?`<div class="section"><div class="section-title">experience</div>${experiences.map(e=>`<div style="margin-bottom:10px"><div class="exp-header"><span class="exp-title">${e.title}</span><span class="exp-date">[${formatDate(e.startDate)} → ${e.isCurrent?'now':formatDate(e.endDate)}]</span></div><div class="exp-company">${e.company}${e.location?` · ${e.location}`:''}</div><div class="exp-desc">${e.description}</div></div>`).join('')}</div><hr class="divider">`:''}
  ${educations.length?`<div class="section"><div class="section-title">education</div>${educations.map(e=>`<div style="margin-bottom:6px"><div class="exp-header"><span style="color:#f1f5f9">${e.institution}</span><span class="exp-date">[${formatDate(e.endDate)}]</span></div><div class="exp-company" style="color:#64748b">${e.degree}${e.fieldOfStudy?` · ${e.fieldOfStudy}`:''}</div></div>`).join('')}</div><hr class="divider">`:''}
  ${skills.length?`<div class="section"><div class="section-title">skills</div><div>${skills.map(s=>`<span class="skill-tag">${s.name}</span>`).join('')}</div></div>`:''}
</body></html>`;
}

// ─── Compact (dense, maximises content) ──────────────────────────────────────

function compactTemplate(c: ResumeContent): string {
  const { personalInfo: p, summary, experiences, educations, skills, certifications } = c;
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:8.5pt;color:#111;padding:22px 32px;background:#fff;}
  h1{font-size:16pt;font-weight:700;display:inline;}
  .header{border-bottom:1px solid #999;padding-bottom:6px;margin-bottom:10px;}
  .contact-line{font-size:7.5pt;color:#555;margin-top:3px;}
  .section{margin-bottom:10px;}
  .section-title{font-size:8pt;font-weight:700;text-transform:uppercase;letter-spacing:.08em;background:#f3f4f6;padding:2px 6px;margin-bottom:5px;display:inline-block;}
  .row{display:flex;justify-content:space-between;align-items:baseline;}
  .exp-title{font-weight:700;font-size:8.5pt;}
  .exp-date{font-size:7.5pt;color:#666;}
  .exp-company{font-size:8pt;color:#444;font-style:italic;}
  .exp-desc{font-size:7.5pt;line-height:1.45;color:#333;white-space:pre-wrap;margin-top:1px;}
  .divider{border:none;border-top:1px solid #e5e7eb;margin:7px 0;}
  .skills-line{font-size:8pt;color:#333;line-height:1.6;}
</style></head><body>
  <div class="header">
    <h1>${p.firstName} ${p.lastName}</h1>
    <div class="contact-line">${[p.email,p.phone,p.location,p.linkedinUrl,p.githubUrl,p.portfolioUrl].filter(Boolean).join(' | ')}</div>
  </div>
  ${summary?`<div class="section"><div class="section-title">Summary</div><div class="exp-desc">${summary}</div></div>`:''}
  ${experiences.length?`<div class="section"><div class="section-title">Experience</div>${experiences.map((e,i)=>`${i>0?'<hr class="divider">':''}<div><div class="row"><span class="exp-title">${e.title}</span><span class="exp-date">${formatDate(e.startDate)} – ${e.isCurrent?'Present':formatDate(e.endDate)}</span></div><div class="exp-company">${e.company}${e.location?` · ${e.location}`:''}</div><div class="exp-desc">${e.description}</div></div>`).join('')}</div>`:''}
  ${educations.length?`<div class="section"><div class="section-title">Education</div>${educations.map(e=>`<div style="margin-bottom:4px"><div class="row"><span class="exp-title">${e.institution}</span><span class="exp-date">${formatDate(e.endDate)}</span></div><div class="exp-company">${e.degree}${e.fieldOfStudy?` · ${e.fieldOfStudy}`:''}${e.gpa?` · GPA ${e.gpa}`:''}</div></div>`).join('')}</div>`:''}
  ${skills.length?`<div class="section"><div class="section-title">Skills</div><div class="skills-line">${skills.map(s=>s.name).join(' · ')}</div></div>`:''}
  ${certifications.length?`<div class="section"><div class="section-title">Certifications</div><div class="skills-line">${certifications.map(c=>{const meta=[c.issuer,c.issueDate?formatDate(c.issueDate):null].filter(Boolean).join(', ');return meta?`${c.name} (${meta})`:c.name;}).join(' · ')}</div></div>`:''}
</body></html>`;
}

// ─── Clean Pro (ultra-clean, gray accents) ────────────────────────────────────

function cleanProTemplate(c: ResumeContent): string {
  const { personalInfo: p, summary, experiences, educations, skills, certifications } = c;
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:9pt;color:#111827;padding:36px 48px;background:#fff;}
  .header{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:20px;padding-bottom:16px;border-bottom:2px solid #111827;}
  h1{font-size:22pt;font-weight:700;letter-spacing:-.02em;}
  .contact-stack{text-align:right;font-size:8pt;color:#6b7280;line-height:1.8;}
  .section{margin-bottom:18px;}
  .section-title{font-size:8pt;font-weight:600;text-transform:uppercase;letter-spacing:.12em;color:#9ca3af;margin-bottom:9px;}
  .exp-grid{display:grid;grid-template-columns:1fr auto;gap:0 16px;align-items:baseline;margin-bottom:2px;}
  .exp-title{font-weight:600;font-size:9.5pt;}
  .exp-date{font-size:7.5pt;color:#9ca3af;white-space:nowrap;}
  .exp-company{font-size:8.5pt;color:#6b7280;margin-bottom:3px;}
  .exp-desc{font-size:8pt;line-height:1.6;color:#374151;white-space:pre-wrap;}
  .sep{border:none;border-top:1px solid #f3f4f6;margin:10px 0;}
  .skills-wrap{display:flex;flex-wrap:wrap;gap:6px;}
  .skill-tag{background:#f9fafb;border:1px solid #e5e7eb;color:#374151;padding:2px 9px;border-radius:4px;font-size:7.5pt;}
</style></head><body>
  <div class="header">
    <h1>${p.firstName} ${p.lastName}</h1>
    <div class="contact-stack">${[p.email,p.phone,p.location,p.linkedinUrl,p.githubUrl,p.portfolioUrl].filter(Boolean).map(v=>`<div>${v}</div>`).join('')}</div>
  </div>
  ${summary?`<div class="section"><div class="section-title">Summary</div><div class="exp-desc">${summary}</div></div>`:''}
  ${experiences.length?`<div class="section"><div class="section-title">Experience</div>${experiences.map((e,i)=>`${i>0?'<hr class="sep">':''}<div><div class="exp-grid"><span class="exp-title">${e.title}</span><span class="exp-date">${formatDate(e.startDate)} – ${e.isCurrent?'Present':formatDate(e.endDate)}</span></div><div class="exp-company">${e.company}${e.location?` · ${e.location}`:''}</div><div class="exp-desc">${e.description}</div></div>`).join('')}</div>`:''}
  ${educations.length?`<div class="section"><div class="section-title">Education</div>${educations.map((e,i)=>`${i>0?'<hr class="sep">':''}<div><div class="exp-grid"><span class="exp-title">${e.institution}</span><span class="exp-date">${formatDate(e.startDate)} – ${formatDate(e.endDate)}</span></div><div class="exp-company">${e.degree}${e.fieldOfStudy?` · ${e.fieldOfStudy}`:''}${e.gpa?` · GPA ${e.gpa}`:''}</div></div>`).join('')}</div>`:''}
  ${skills.length?`<div class="section"><div class="section-title">Skills</div><div class="skills-wrap">${skills.map(s=>`<span class="skill-tag">${s.name}</span>`).join('')}</div></div>`:''}
  ${certifications.length?`<div class="section"><div class="section-title">Certifications</div><div class="exp-desc">${certifications.map(c=>`${c.name} · ${c.issuer}`).join(' · ')}</div></div>`:''}
</body></html>`;
}

// ─── Registry ─────────────────────────────────────────────────────────────────

const TEMPLATES: Record<string, (c: ResumeContent) => string> = {
  minimal: minimalTemplate,
  compact: compactTemplate,
  elegant: elegantTemplate,
  tech: techTemplate,
  cleanpro: cleanProTemplate,
};

export function renderTemplate(templateId: string, contentJson: ResumeContent): string {
  const fn = TEMPLATES[templateId] ?? TEMPLATES['minimal'];
  return fn(contentJson);
}

export const TEMPLATE_LIST = [
  { id: 'minimal',    name: 'Minimal',     description: 'Clean with plenty of whitespace' },
  { id: 'compact',    name: 'Compact',     description: 'Dense layout that maximises content per page' },
  { id: 'elegant',    name: 'Elegant',     description: 'Centered serif header with decorative rules' },
  { id: 'tech',       name: 'Tech',        description: 'Dark theme with monospace code aesthetic' },
  { id: 'cleanpro',   name: 'Clean Pro',   description: 'Ultra-clean, right-aligned contact stack' },
];
