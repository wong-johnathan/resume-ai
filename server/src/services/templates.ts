import { ResumeContent } from './claude';

function formatDate(d: string | Date | null | undefined): string {
  if (!d) return '';
  const date = new Date(d);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

// ─── Modern (two-column) ─────────────────────────────────────────────────────

function modernTemplate(c: ResumeContent): string {
  const { personalInfo: p, summary, experiences, educations, skills, certifications } = c;
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:9pt;color:#222;margin:0;}
  .wrap{display:flex;width:100%;}
  .sidebar{width:200px;min-width:200px;color:#fff;padding:24px 16px;flex-shrink:0;background:#1e3a5f;}
  .main{flex:1;padding:28px 24px;}
  .name{font-size:18pt;font-weight:700;line-height:1.2;margin-bottom:4px;}
  .title-label{font-size:9pt;opacity:.75;margin-bottom:20px;}
  .sidebar h3{font-size:8pt;text-transform:uppercase;letter-spacing:.08em;opacity:.6;margin:20px 0 8px;}
  .sidebar h3:first-of-type{margin-top:0;}
  .contact-item{font-size:7.5pt;margin-bottom:5px;word-break:break-all;opacity:.9;}
  .skill-row{display:flex;justify-content:space-between;font-size:7.5pt;margin-bottom:4px;}
  .skill-bar{width:100%;height:3px;background:rgba(255,255,255,.2);border-radius:2px;margin-bottom:8px;}
  .skill-fill{height:3px;border-radius:2px;background:#7eb8f7;}
  .section{margin-bottom:20px;}
  .section-title{font-size:11pt;font-weight:700;color:#1e3a5f;border-bottom:2px solid #1e3a5f;padding-bottom:3px;margin-bottom:10px;}
  .exp-header{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:2px;}
  .exp-title{font-weight:700;font-size:9.5pt;}
  .exp-date{font-size:8pt;color:#555;}
  .exp-company{font-size:8.5pt;color:#444;margin-bottom:4px;}
  .exp-desc{font-size:8pt;color:#333;line-height:1.5;white-space:pre-wrap;}
  .edu-row{margin-bottom:8px;}
  .cert-row{font-size:8pt;margin-bottom:4px;}
</style>
</head><body><div class="wrap">
<div class="sidebar">
  <div class="name">${p.firstName}<br>${p.lastName}</div>
  <h3>Contact</h3>
  ${p.email ? `<div class="contact-item">${p.email}</div>` : ''}
  ${p.phone ? `<div class="contact-item">${p.phone}</div>` : ''}
  ${p.location ? `<div class="contact-item">${p.location}</div>` : ''}
  ${p.linkedinUrl ? `<div class="contact-item">${p.linkedinUrl}</div>` : ''}
  ${p.githubUrl ? `<div class="contact-item">${p.githubUrl}</div>` : ''}
  ${p.portfolioUrl ? `<div class="contact-item">${p.portfolioUrl}</div>` : ''}
  ${skills.length ? `<h3>Skills</h3>${skills.map(s => {
    const pct = s.level === 'EXPERT' ? 100 : s.level === 'ADVANCED' ? 80 : s.level === 'INTERMEDIATE' ? 60 : 40;
    return `<div class="skill-row"><span>${s.name}</span></div><div class="skill-bar"><div class="skill-fill" style="width:${pct}%"></div></div>`;
  }).join('')}` : ''}
  ${certifications.length ? `<h3>Certs</h3>${certifications.map(c => `<div class="contact-item">${c.name}</div>`).join('')}` : ''}
</div>
<div class="main">
  ${summary ? `<div class="section"><div class="section-title">Summary</div><div class="exp-desc">${summary}</div></div>` : ''}
  ${experiences.length ? `<div class="section"><div class="section-title">Experience</div>${experiences.map(e => `
    <div style="margin-bottom:12px">
      <div class="exp-header"><span class="exp-title">${e.title}</span><span class="exp-date">${formatDate(e.startDate)} – ${e.isCurrent ? 'Present' : formatDate(e.endDate)}</span></div>
      <div class="exp-company">${e.company}${e.location ? ` · ${e.location}` : ''}</div>
      <div class="exp-desc">${e.description}</div>
    </div>`).join('')}</div>` : ''}
  ${educations.length ? `<div class="section"><div class="section-title">Education</div>${educations.map(e => `
    <div class="edu-row">
      <div class="exp-header"><span class="exp-title">${e.degree}${e.fieldOfStudy ? ` in ${e.fieldOfStudy}` : ''}</span><span class="exp-date">${formatDate(e.startDate)} – ${formatDate(e.endDate)}</span></div>
      <div class="exp-company">${e.institution}${e.gpa ? ` · GPA: ${e.gpa}` : ''}</div>
    </div>`).join('')}</div>` : ''}
</div>
</div></body></html>`;
}

// ─── Classic (single-column, serif) ──────────────────────────────────────────

function classicTemplate(c: ResumeContent): string {
  const { personalInfo: p, summary, experiences, educations, skills, certifications } = c;
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:Georgia,'Times New Roman',serif;font-size:10pt;color:#111;padding:36px 48px;overflow-wrap:break-word;word-break:break-word;}
  .header{text-align:center;border-bottom:2px solid #111;padding-bottom:12px;margin-bottom:16px;}
  .header h1{font-size:20pt;letter-spacing:.04em;}
  .contact-line{font-size:8.5pt;color:#444;margin-top:6px;display:flex;flex-wrap:wrap;justify-content:center;gap:0 6px;}
  .section{margin-bottom:18px;}
  .section-title{font-size:10.5pt;font-weight:700;text-transform:uppercase;letter-spacing:.1em;border-bottom:1px solid #999;padding-bottom:3px;margin-bottom:8px;}
  .exp-header{display:flex;justify-content:space-between;gap:8px;}
  .exp-title{font-weight:700;}
  .exp-date{font-size:9pt;color:#555;white-space:nowrap;}
  .exp-company{font-style:italic;font-size:9pt;margin-bottom:3px;}
  .exp-desc{font-size:9pt;line-height:1.6;white-space:pre-wrap;margin-top:3px;overflow-wrap:break-word;}
  .skills-list{font-size:9pt;line-height:1.7;}
  .cert-row{font-size:9pt;margin-bottom:3px;}
</style>
</head><body>
<div class="header">
  <h1>${p.firstName} ${p.lastName}</h1>
  <div class="contact-line">${[p.email,p.phone,p.location,p.linkedinUrl,p.githubUrl,p.portfolioUrl].filter(Boolean).map(v=>`<span>${v}</span>`).join('<span style="margin:0 3px;opacity:.4">·</span>')}</div>
</div>
${summary ? `<div class="section"><div class="section-title">Professional Summary</div><div class="exp-desc">${summary}</div></div>` : ''}
${experiences.length ? `<div class="section"><div class="section-title">Experience</div>${experiences.map(e => `
  <div style="margin-bottom:10px">
    <div class="exp-header"><span class="exp-title">${e.title}</span><span class="exp-date">${formatDate(e.startDate)} – ${e.isCurrent ? 'Present' : formatDate(e.endDate)}</span></div>
    <div class="exp-company">${e.company}${e.location ? `, ${e.location}` : ''}</div>
    <div class="exp-desc">${e.description}</div>
  </div>`).join('')}</div>` : ''}
${educations.length ? `<div class="section"><div class="section-title">Education</div>${educations.map(e => `
  <div style="margin-bottom:8px">
    <div class="exp-header"><span class="exp-title">${e.institution}</span><span class="exp-date">${formatDate(e.startDate)} – ${formatDate(e.endDate)}</span></div>
    <div class="exp-company">${e.degree}${e.fieldOfStudy ? `, ${e.fieldOfStudy}` : ''}${e.gpa ? ` · GPA ${e.gpa}` : ''}</div>
  </div>`).join('')}</div>` : ''}
${skills.length ? `<div class="section"><div class="section-title">Skills</div><div class="skills-list">${skills.map(s => s.name).join(' · ')}</div></div>` : ''}
${certifications.length ? `<div class="section"><div class="section-title">Certifications</div>${certifications.map(c => `<div class="cert-row"><strong>${c.name}</strong> — ${c.issuer}${c.issueDate ? ` (${formatDate(c.issueDate)})` : ''}</div>`).join('')}</div>` : ''}
</body></html>`;
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

// ─── Executive ────────────────────────────────────────────────────────────────

function executiveTemplate(c: ResumeContent): string {
  const { personalInfo: p, summary, experiences, educations, skills, certifications } = c;
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:9pt;color:#1a1a1a;padding:32px 44px;overflow-wrap:break-word;word-break:break-word;}
  .header{border-left:5px solid #c0392b;padding-left:16px;margin-bottom:18px;}
  h1{font-size:21pt;font-weight:800;letter-spacing:-.01em;line-height:1.1;}
  .contact-line{font-size:8pt;color:#555;margin-top:5px;display:flex;flex-wrap:wrap;gap:0 6px;}
  hr.thick{border:none;border-top:2px solid #1a1a1a;margin:14px 0;}
  .section{margin-bottom:14px;}
  .section-title{font-size:9pt;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#c0392b;margin-bottom:6px;}
  .exp-row{display:flex;justify-content:space-between;align-items:baseline;}
  .exp-title{font-weight:700;font-size:9.5pt;}
  .exp-date{font-size:7.5pt;color:#666;}
  .exp-company{font-size:8.5pt;font-weight:600;color:#333;margin-bottom:2px;}
  .exp-desc{font-size:8pt;line-height:1.5;color:#333;white-space:pre-wrap;margin-top:2px;}
  .skills-inline{font-size:8.5pt;line-height:1.7;color:#333;}
  .cert-row{font-size:8pt;margin-bottom:2px;}
  table.edu{width:100%;font-size:8.5pt;border-collapse:collapse;}
  table.edu td{padding:1px 0;}
</style>
</head><body>
<div class="header">
  <h1>${p.firstName} ${p.lastName}</h1>
  <div class="contact-line">${[p.email,p.phone,p.location,p.linkedinUrl,p.githubUrl,p.portfolioUrl].filter(Boolean).map(v=>`<span>${v}</span>`).join('<span style="margin:0 3px;opacity:.4">·</span>')}</div>
</div>
<hr class="thick">
${summary ? `<div class="section"><div class="section-title">Executive Summary</div><div class="exp-desc">${summary}</div></div><hr class="thick">` : ''}
${experiences.length ? `<div class="section"><div class="section-title">Professional Experience</div>${experiences.map(e => `
  <div style="margin-bottom:9px">
    <div class="exp-row"><span class="exp-title">${e.title}</span><span class="exp-date">${formatDate(e.startDate)} – ${e.isCurrent ? 'Present' : formatDate(e.endDate)}</span></div>
    <div class="exp-company">${e.company}${e.location ? ` · ${e.location}` : ''}</div>
    <div class="exp-desc">${e.description}</div>
  </div>`).join('')}</div><hr class="thick">` : ''}
${educations.length ? `<div class="section"><div class="section-title">Education</div><table class="edu">${educations.map(e => `
  <tr><td><strong>${e.institution}</strong> — ${e.degree}${e.fieldOfStudy ? `, ${e.fieldOfStudy}` : ''}${e.gpa ? ` (GPA: ${e.gpa})` : ''}</td><td style="text-align:right;color:#666;font-size:7.5pt">${formatDate(e.startDate)} – ${formatDate(e.endDate)}</td></tr>`).join('')}</table></div>` : ''}
${skills.length ? `<div class="section"><div class="section-title">Core Competencies</div><div class="skills-inline">${skills.map(s => s.name).join(' · ')}</div></div>` : ''}
${certifications.length ? `<div class="section"><div class="section-title">Certifications</div>${certifications.map(c => `<div class="cert-row"><strong>${c.name}</strong> — ${c.issuer}${c.issueDate ? ` (${formatDate(c.issueDate)})` : ''}</div>`).join('')}</div>` : ''}
</body></html>`;
}

// ─── Slate (dark header, clean single-column) ────────────────────────────────

function slateTemplate(c: ResumeContent): string {
  const { personalInfo: p, summary, experiences, educations, skills, certifications } = c;
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:9pt;color:#2d3748;background:#fff;}
  .header{background:#2d3748;color:#fff;padding:28px 40px 22px;}
  .header h1{font-size:22pt;font-weight:700;letter-spacing:-.02em;}
  .contact-bar{display:flex;flex-wrap:wrap;gap:12px;margin-top:8px;font-size:7.5pt;opacity:.8;}
  .body{padding:24px 40px;}
  .section{margin-bottom:18px;}
  .section-title{font-size:8pt;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#718096;border-bottom:1px solid #e2e8f0;padding-bottom:4px;margin-bottom:10px;}
  .exp-header{display:flex;justify-content:space-between;align-items:baseline;}
  .exp-title{font-weight:700;font-size:9.5pt;color:#1a202c;}
  .exp-date{font-size:7.5pt;color:#718096;}
  .exp-company{font-size:8.5pt;color:#4a5568;margin-bottom:3px;}
  .exp-desc{font-size:8pt;line-height:1.6;color:#4a5568;white-space:pre-wrap;}
  .skills-wrap{display:flex;flex-wrap:wrap;gap:5px;}
  .skill-tag{background:#edf2f7;color:#2d3748;padding:2px 8px;border-radius:3px;font-size:7.5pt;}
  .cert-row{font-size:8.5pt;margin-bottom:3px;}
</style></head><body>
<div class="header">
  <h1>${p.firstName} ${p.lastName}</h1>
  <div class="contact-bar">
    ${[p.email,p.phone,p.location,p.linkedinUrl,p.githubUrl,p.portfolioUrl].filter(Boolean).map(v=>`<span>${v}</span>`).join('')}
  </div>
</div>
<div class="body">
  ${summary?`<div class="section"><div class="section-title">Profile</div><div class="exp-desc">${summary}</div></div>`:''}
  ${experiences.length?`<div class="section"><div class="section-title">Experience</div>${experiences.map(e=>`<div style="margin-bottom:11px"><div class="exp-header"><span class="exp-title">${e.title}</span><span class="exp-date">${formatDate(e.startDate)} – ${e.isCurrent?'Present':formatDate(e.endDate)}</span></div><div class="exp-company">${e.company}${e.location?` · ${e.location}`:''}</div><div class="exp-desc">${e.description}</div></div>`).join('')}</div>`:''}
  ${educations.length?`<div class="section"><div class="section-title">Education</div>${educations.map(e=>`<div style="margin-bottom:7px"><div class="exp-header"><span class="exp-title">${e.institution}</span><span class="exp-date">${formatDate(e.startDate)} – ${formatDate(e.endDate)}</span></div><div class="exp-company">${e.degree}${e.fieldOfStudy?` · ${e.fieldOfStudy}`:''}${e.gpa?` · GPA ${e.gpa}`:''}</div></div>`).join('')}</div>`:''}
  ${skills.length?`<div class="section"><div class="section-title">Skills</div><div class="skills-wrap">${skills.map(s=>`<span class="skill-tag">${s.name}</span>`).join('')}</div></div>`:''}
  ${certifications.length?`<div class="section"><div class="section-title">Certifications</div>${certifications.map(c=>`<div class="cert-row"><strong>${c.name}</strong> · ${c.issuer}</div>`).join('')}</div>`:''}
</div></body></html>`;
}

// ─── Teal (right sidebar) ─────────────────────────────────────────────────────

function tealTemplate(c: ResumeContent): string {
  const { personalInfo: p, summary, experiences, educations, skills, certifications } = c;
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:9pt;color:#222;margin:0;}
  .wrap{display:flex;width:100%;}
  .main{flex:1;padding:28px 24px;}
  .sidebar{width:190px;min-width:190px;color:#fff;padding:28px 16px;flex-shrink:0;background:#0d9488;}
  .name-block{margin-bottom:20px;}
  h1{font-size:19pt;font-weight:700;line-height:1.2;}
  .section{margin-bottom:18px;}
  .section-title{font-size:10.5pt;font-weight:700;color:#0d9488;border-bottom:2px solid #0d9488;padding-bottom:3px;margin-bottom:8px;}
  .exp-header{display:flex;justify-content:space-between;align-items:baseline;}
  .exp-title{font-weight:700;font-size:9.5pt;}
  .exp-date{font-size:7.5pt;color:#555;}
  .exp-company{font-size:8.5pt;color:#444;margin-bottom:3px;}
  .exp-desc{font-size:8pt;line-height:1.5;white-space:pre-wrap;}
  .sb-label{font-size:7pt;text-transform:uppercase;letter-spacing:.08em;opacity:.65;margin:16px 0 6px;}
  .sb-label:first-child{margin-top:0;}
  .sb-item{font-size:7.5pt;opacity:.9;margin-bottom:4px;word-break:break-all;}
  .sb-skill{font-size:7.5pt;background:rgba(255,255,255,.15);border-radius:3px;padding:2px 6px;margin-bottom:4px;display:block;}
</style></head><body><div class="wrap">
<div class="main">
  <div class="name-block"><h1>${p.firstName} ${p.lastName}</h1></div>
  ${summary?`<div class="section"><div class="section-title">Summary</div><div class="exp-desc">${summary}</div></div>`:''}
  ${experiences.length?`<div class="section"><div class="section-title">Experience</div>${experiences.map(e=>`<div style="margin-bottom:10px"><div class="exp-header"><span class="exp-title">${e.title}</span><span class="exp-date">${formatDate(e.startDate)} – ${e.isCurrent?'Present':formatDate(e.endDate)}</span></div><div class="exp-company">${e.company}${e.location?` · ${e.location}`:''}</div><div class="exp-desc">${e.description}</div></div>`).join('')}</div>`:''}
  ${educations.length?`<div class="section"><div class="section-title">Education</div>${educations.map(e=>`<div style="margin-bottom:7px"><div class="exp-header"><span class="exp-title">${e.institution}</span><span class="exp-date">${formatDate(e.endDate)}</span></div><div class="exp-company">${e.degree}${e.fieldOfStudy?` · ${e.fieldOfStudy}`:''}</div></div>`).join('')}</div>`:''}
</div>
<div class="sidebar">
  <div class="sb-label">Contact</div>
  ${[p.email,p.phone,p.location,p.linkedinUrl,p.githubUrl,p.portfolioUrl].filter(Boolean).map(v=>`<div class="sb-item">${v}</div>`).join('')}
  ${skills.length?`<div class="sb-label">Skills</div>${skills.map(s=>`<span class="sb-skill">${s.name}</span>`).join('')}`:''}
  ${certifications.length?`<div class="sb-label">Certifications</div>${certifications.map(c=>`<div class="sb-item">${c.name}</div>`).join('')}`:''}
</div>
</div></body></html>`;
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

// ─── Creative (bold left accent bar, vivid purple) ────────────────────────────

function creativeTemplate(c: ResumeContent): string {
  const { personalInfo: p, summary, experiences, educations, skills, certifications } = c;
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:9pt;color:#1a1a2e;margin:0;}
  .wrap{display:flex;width:100%;}
  .accent{width:8px;min-width:8px;flex-shrink:0;background:#7c3aed;}
  .content{flex:1;padding:28px 36px;}
  .header{margin-bottom:20px;padding-bottom:14px;border-bottom:1px solid #e5e7eb;}
  h1{font-size:22pt;font-weight:800;letter-spacing:-.02em;}
  .contact-line{font-size:7.5pt;color:#6b7280;margin-top:5px;}
  .section{margin-bottom:16px;}
  .section-title{font-size:8pt;font-weight:800;text-transform:uppercase;letter-spacing:.1em;background:linear-gradient(90deg,#7c3aed,#db2777);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:8px;}
  .exp-header{display:flex;justify-content:space-between;align-items:baseline;}
  .exp-title{font-weight:700;font-size:9.5pt;}
  .exp-date{font-size:7.5pt;color:#9ca3af;}
  .exp-company{font-size:8.5pt;color:#6b7280;margin-bottom:3px;}
  .exp-desc{font-size:8pt;line-height:1.55;white-space:pre-wrap;color:#374151;}
  .skill-pill{display:inline-block;background:#f3e8ff;color:#7c3aed;border-radius:999px;padding:2px 9px;font-size:7.5pt;margin:2px 2px 0 0;}
</style></head><body><div class="wrap">
<div class="accent"></div>
<div class="content">
  <div class="header">
    <h1>${p.firstName} ${p.lastName}</h1>
    <div class="contact-line">${[p.email,p.phone,p.location,p.linkedinUrl,p.githubUrl,p.portfolioUrl].filter(Boolean).join(' · ')}</div>
  </div>
  ${summary?`<div class="section"><div class="section-title">About Me</div><div class="exp-desc">${summary}</div></div>`:''}
  ${experiences.length?`<div class="section"><div class="section-title">Experience</div>${experiences.map(e=>`<div style="margin-bottom:10px"><div class="exp-header"><span class="exp-title">${e.title}</span><span class="exp-date">${formatDate(e.startDate)} – ${e.isCurrent?'Present':formatDate(e.endDate)}</span></div><div class="exp-company">${e.company}${e.location?` · ${e.location}`:''}</div><div class="exp-desc">${e.description}</div></div>`).join('')}</div>`:''}
  ${educations.length?`<div class="section"><div class="section-title">Education</div>${educations.map(e=>`<div style="margin-bottom:7px"><div class="exp-header"><span class="exp-title">${e.institution}</span><span class="exp-date">${formatDate(e.startDate)} – ${formatDate(e.endDate)}</span></div><div class="exp-company">${e.degree}${e.fieldOfStudy?` · ${e.fieldOfStudy}`:''}${e.gpa?` · GPA ${e.gpa}`:''}</div></div>`).join('')}</div>`:''}
  ${skills.length?`<div class="section"><div class="section-title">Skills</div><div>${skills.map(s=>`<span class="skill-pill">${s.name}</span>`).join('')}</div></div>`:''}
  ${certifications.length?`<div class="section"><div class="section-title">Certifications</div>${certifications.map(c=>`<div style="font-size:8.5pt;margin-bottom:3px"><strong>${c.name}</strong> · ${c.issuer}</div>`).join('')}</div>`:''}
</div></div></body></html>`;
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

// ─── Gradient (purple-blue header, SaaS-modern) ───────────────────────────────

function gradientTemplate(c: ResumeContent): string {
  const { personalInfo: p, summary, experiences, educations, skills, certifications } = c;
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:9pt;color:#1e293b;background:#fff;}
  .header{background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 50%,#2563eb 100%);padding:30px 40px 24px;color:#fff;}
  h1{font-size:22pt;font-weight:700;letter-spacing:-.02em;}
  .contact-bar{display:flex;flex-wrap:wrap;gap:14px;margin-top:8px;font-size:7.5pt;opacity:.85;}
  .body{padding:22px 40px;}
  .section{margin-bottom:17px;}
  .section-title{font-size:8pt;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#4f46e5;margin-bottom:8px;display:flex;align-items:center;gap:8px;}
  .section-title::after{content:'';flex:1;height:1px;background:#e0e7ff;}
  .exp-header{display:flex;justify-content:space-between;align-items:baseline;}
  .exp-title{font-weight:700;font-size:9.5pt;}
  .exp-date{font-size:7.5pt;color:#94a3b8;}
  .exp-company{font-size:8.5pt;color:#64748b;margin-bottom:3px;}
  .exp-desc{font-size:8pt;line-height:1.55;color:#475569;white-space:pre-wrap;}
  .skill-pill{display:inline-block;background:#eef2ff;color:#4f46e5;border-radius:999px;padding:2px 9px;font-size:7.5pt;margin:2px 2px 0 0;border:1px solid #c7d2fe;}
</style></head><body>
<div class="header">
  <h1>${p.firstName} ${p.lastName}</h1>
  <div class="contact-bar">${[p.email,p.phone,p.location,p.linkedinUrl,p.githubUrl,p.portfolioUrl].filter(Boolean).map(v=>`<span>${v}</span>`).join('')}</div>
</div>
<div class="body">
  ${summary?`<div class="section"><div class="section-title">Profile</div><div class="exp-desc">${summary}</div></div>`:''}
  ${experiences.length?`<div class="section"><div class="section-title">Experience</div>${experiences.map(e=>`<div style="margin-bottom:11px"><div class="exp-header"><span class="exp-title">${e.title}</span><span class="exp-date">${formatDate(e.startDate)} – ${e.isCurrent?'Present':formatDate(e.endDate)}</span></div><div class="exp-company">${e.company}${e.location?` · ${e.location}`:''}</div><div class="exp-desc">${e.description}</div></div>`).join('')}</div>`:''}
  ${educations.length?`<div class="section"><div class="section-title">Education</div>${educations.map(e=>`<div style="margin-bottom:7px"><div class="exp-header"><span class="exp-title">${e.institution}</span><span class="exp-date">${formatDate(e.startDate)} – ${formatDate(e.endDate)}</span></div><div class="exp-company">${e.degree}${e.fieldOfStudy?` · ${e.fieldOfStudy}`:''}${e.gpa?` · GPA ${e.gpa}`:''}</div></div>`).join('')}</div>`:''}
  ${skills.length?`<div class="section"><div class="section-title">Skills</div><div>${skills.map(s=>`<span class="skill-pill">${s.name}</span>`).join('')}</div></div>`:''}
  ${certifications.length?`<div class="section"><div class="section-title">Certifications</div>${certifications.map(c=>`<div style="font-size:8.5pt;margin-bottom:3px"><strong>${c.name}</strong> · ${c.issuer}</div>`).join('')}</div>`:''}
</div></body></html>`;
}

// ─── Timeline (vertical timeline experience) ──────────────────────────────────

function timelineTemplate(c: ResumeContent): string {
  const { personalInfo: p, summary, experiences, educations, skills, certifications } = c;
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:9pt;color:#1f2937;padding:32px 40px;background:#fff;}
  h1{font-size:22pt;font-weight:700;color:#111827;}
  .contact-line{font-size:8pt;color:#6b7280;margin-top:5px;margin-bottom:20px;border-bottom:2px solid #f97316;padding-bottom:12px;}
  .section{margin-bottom:18px;}
  .section-title{font-size:9pt;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#f97316;margin-bottom:12px;}
  .timeline{padding-left:18px;border-left:2px solid #fed7aa;}
  .tl-item{position:relative;margin-bottom:12px;padding-left:14px;}
  .tl-dot{position:absolute;left:-20px;top:3px;width:8px;height:8px;border-radius:50%;background:#f97316;border:2px solid #fff;box-shadow:0 0 0 2px #f97316;}
  .exp-header{display:flex;justify-content:space-between;align-items:baseline;}
  .exp-title{font-weight:700;font-size:9.5pt;}
  .exp-date{font-size:7.5pt;color:#9ca3af;}
  .exp-company{font-size:8.5pt;color:#6b7280;margin-bottom:3px;}
  .exp-desc{font-size:8pt;line-height:1.55;color:#374151;white-space:pre-wrap;}
  .skills-wrap{display:flex;flex-wrap:wrap;gap:5px;}
  .skill-tag{background:#fff7ed;color:#c2410c;border:1px solid #fed7aa;padding:2px 8px;border-radius:4px;font-size:7.5pt;}
  .edu-row{margin-bottom:7px;}
</style></head><body>
  <h1>${p.firstName} ${p.lastName}</h1>
  <div class="contact-line">${[p.email,p.phone,p.location,p.linkedinUrl,p.githubUrl,p.portfolioUrl].filter(Boolean).join(' · ')}</div>
  ${summary?`<div class="section"><div class="section-title">Summary</div><div class="exp-desc">${summary}</div></div>`:''}
  ${experiences.length?`<div class="section"><div class="section-title">Experience</div><div class="timeline">${experiences.map(e=>`<div class="tl-item"><div class="tl-dot"></div><div class="exp-header"><span class="exp-title">${e.title}</span><span class="exp-date">${formatDate(e.startDate)} – ${e.isCurrent?'Present':formatDate(e.endDate)}</span></div><div class="exp-company">${e.company}${e.location?` · ${e.location}`:''}</div><div class="exp-desc">${e.description}</div></div>`).join('')}</div></div>`:''}
  ${educations.length?`<div class="section"><div class="section-title">Education</div>${educations.map(e=>`<div class="edu-row"><div class="exp-header"><span style="font-weight:700">${e.institution}</span><span class="exp-date">${formatDate(e.startDate)} – ${formatDate(e.endDate)}</span></div><div style="font-size:8.5pt;color:#6b7280">${e.degree}${e.fieldOfStudy?` · ${e.fieldOfStudy}`:''}${e.gpa?` · GPA ${e.gpa}`:''}</div></div>`).join('')}</div>`:''}
  ${skills.length?`<div class="section"><div class="section-title">Skills</div><div class="skills-wrap">${skills.map(s=>`<span class="skill-tag">${s.name}</span>`).join('')}</div></div>`:''}
  ${certifications.length?`<div class="section"><div class="section-title">Certifications</div>${certifications.map(c=>`<div style="font-size:8.5pt;margin-bottom:3px"><strong>${c.name}</strong> · ${c.issuer}</div>`).join('')}</div>`:''}
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

// ─── Academic (CV-style, detailed) ───────────────────────────────────────────

function academicTemplate(c: ResumeContent): string {
  const { personalInfo: p, summary, experiences, educations, skills, certifications } = c;
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:'Times New Roman',Times,serif;font-size:10pt;color:#000;padding:40px 56px;overflow-wrap:break-word;word-break:break-word;}
  h1{font-size:18pt;font-weight:700;text-align:center;letter-spacing:.02em;}
  .contact-line{font-size:9pt;text-align:center;color:#333;margin-top:4px;margin-bottom:20px;display:flex;flex-wrap:wrap;justify-content:center;gap:0 6px;}
  .section{margin-bottom:16px;}
  .section-title{font-size:11pt;font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px;}
  .section-rule{border:none;border-top:1.5px solid #000;margin-bottom:8px;}
  .exp-header{display:flex;justify-content:space-between;}
  .exp-title{font-weight:700;}
  .exp-date{font-size:9pt;color:#333;}
  .exp-company{font-style:italic;font-size:9pt;margin-bottom:2px;}
  .exp-desc{font-size:9pt;line-height:1.65;white-space:pre-wrap;text-align:justify;}
  .skills-para{font-size:9.5pt;line-height:1.7;text-align:justify;}
</style></head><body>
  <h1>${p.firstName} ${p.lastName}</h1>
  <div class="contact-line">${[p.email,p.phone,p.location,p.linkedinUrl,p.githubUrl,p.portfolioUrl].filter(Boolean).map(v=>`<span>${v}</span>`).join('<span style="margin:0 3px;opacity:.4">·</span>')}</div>
  ${summary?`<div class="section"><div class="section-title">Research Interests &amp; Profile</div><hr class="section-rule"><div class="exp-desc">${summary}</div></div>`:''}
  ${educations.length?`<div class="section"><div class="section-title">Education</div><hr class="section-rule">${educations.map(e=>`<div style="margin-bottom:8px"><div class="exp-header"><span class="exp-title">${e.institution}</span><span class="exp-date">${formatDate(e.startDate)} – ${formatDate(e.endDate)}</span></div><div class="exp-company">${e.degree}${e.fieldOfStudy?`, ${e.fieldOfStudy}`:''}${e.gpa?` — GPA: ${e.gpa}`:''}</div></div>`).join('')}</div>`:''}
  ${experiences.length?`<div class="section"><div class="section-title">Professional Experience</div><hr class="section-rule">${experiences.map(e=>`<div style="margin-bottom:10px"><div class="exp-header"><span class="exp-title">${e.title}</span><span class="exp-date">${formatDate(e.startDate)} – ${e.isCurrent?'Present':formatDate(e.endDate)}</span></div><div class="exp-company">${e.company}${e.location?`, ${e.location}`:''}</div><div class="exp-desc">${e.description}</div></div>`).join('')}</div>`:''}
  ${skills.length?`<div class="section"><div class="section-title">Skills &amp; Expertise</div><hr class="section-rule"><div class="skills-para">${skills.map(s=>s.name).join(', ')}.</div></div>`:''}
  ${certifications.length?`<div class="section"><div class="section-title">Certifications &amp; Awards</div><hr class="section-rule">${certifications.map(c=>`<div style="margin-bottom:4px"><strong>${c.name}</strong>, ${c.issuer}${c.issueDate?`, ${formatDate(c.issueDate)}`:''}</div>`).join('')}</div>`:''}
</body></html>`;
}

// ─── Coral (warm accent, modern two-column) ───────────────────────────────────

function coralTemplate(c: ResumeContent): string {
  const { personalInfo: p, summary, experiences, educations, skills, certifications } = c;
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:9pt;color:#292524;margin:0;}
  .wrap{display:flex;width:100%;}
  .sidebar{width:195px;min-width:195px;padding:26px 16px;border-right:3px solid #fb7185;flex-shrink:0;background:#fff1ee;}
  .main{flex:1;padding:26px 26px;}
  .avatar-block{margin-bottom:16px;}
  .name{font-size:16pt;font-weight:800;color:#e11d48;line-height:1.2;}
  .sb-label{font-size:7pt;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#e11d48;margin:14px 0 5px;}
  .sb-label:first-of-type{margin-top:0;}
  .sb-item{font-size:7.5pt;color:#57534e;margin-bottom:4px;word-break:break-all;}
  .skill-dot::before{content:'● ';color:#fb7185;font-size:7pt;}
  .skill-dot{font-size:7.5pt;color:#44403c;margin-bottom:3px;}
  .section{margin-bottom:16px;}
  .section-title{font-size:9pt;font-weight:700;color:#e11d48;margin-bottom:7px;display:flex;align-items:center;gap:6px;}
  .section-title::after{content:'';flex:1;height:1.5px;background:#fecdd3;}
  .exp-header{display:flex;justify-content:space-between;align-items:baseline;}
  .exp-title{font-weight:700;font-size:9.5pt;}
  .exp-date{font-size:7.5pt;color:#a8a29e;}
  .exp-company{font-size:8.5pt;color:#78716c;margin-bottom:3px;}
  .exp-desc{font-size:8pt;line-height:1.55;white-space:pre-wrap;color:#44403c;}
</style></head><body><div class="wrap">
<div class="sidebar">
  <div class="name">${p.firstName}<br>${p.lastName}</div>
  <div class="sb-label">Contact</div>
  ${[p.email,p.phone,p.location,p.linkedinUrl,p.githubUrl,p.portfolioUrl].filter(Boolean).map(v=>`<div class="sb-item">${v}</div>`).join('')}
  ${skills.length?`<div class="sb-label">Skills</div>${skills.map(s=>`<div class="skill-dot">${s.name}</div>`).join('')}`:''}
  ${certifications.length?`<div class="sb-label">Certs</div>${certifications.map(c=>`<div class="sb-item">${c.name}</div>`).join('')}`:''}
</div>
<div class="main">
  ${summary?`<div class="section"><div class="section-title">Summary</div><div class="exp-desc">${summary}</div></div>`:''}
  ${experiences.length?`<div class="section"><div class="section-title">Experience</div>${experiences.map(e=>`<div style="margin-bottom:10px"><div class="exp-header"><span class="exp-title">${e.title}</span><span class="exp-date">${formatDate(e.startDate)} – ${e.isCurrent?'Present':formatDate(e.endDate)}</span></div><div class="exp-company">${e.company}${e.location?` · ${e.location}`:''}</div><div class="exp-desc">${e.description}</div></div>`).join('')}</div>`:''}
  ${educations.length?`<div class="section"><div class="section-title">Education</div>${educations.map(e=>`<div style="margin-bottom:7px"><div class="exp-header"><span class="exp-title">${e.institution}</span><span class="exp-date">${formatDate(e.startDate)} – ${formatDate(e.endDate)}</span></div><div class="exp-company">${e.degree}${e.fieldOfStudy?` · ${e.fieldOfStudy}`:''}${e.gpa?` · GPA ${e.gpa}`:''}</div></div>`).join('')}</div>`:''}
</div></div></body></html>`;
}

// ─── Navy (deep navy + gold accents) ─────────────────────────────────────────

function navyTemplate(c: ResumeContent): string {
  const { personalInfo: p, summary, experiences, educations, skills, certifications } = c;
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:9pt;color:#1e293b;margin:0;}
  .wrap{display:flex;width:100%;}
  .sidebar{width:205px;min-width:205px;color:#fff;padding:28px 18px;flex-shrink:0;background:#0f2044;}
  .main{flex:1;padding:28px 28px;}
  .name{font-size:18pt;font-weight:700;line-height:1.2;color:#fbbf24;}
  .gold-rule{width:40px;height:3px;background:#fbbf24;margin:10px 0 16px;}
  .sb-label{font-size:7pt;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#fbbf24;margin:16px 0 6px;}
  .sb-label:first-of-type{margin-top:0;}
  .sb-item{font-size:7.5pt;opacity:.85;margin-bottom:4px;word-break:break-all;}
  .skill-bar-wrap{margin-bottom:6px;}
  .skill-name{font-size:7.5pt;opacity:.85;margin-bottom:2px;}
  .skill-bar{height:3px;background:rgba(255,255,255,.2);border-radius:2px;}
  .skill-fill{height:3px;background:#fbbf24;border-radius:2px;}
  .section{margin-bottom:18px;}
  .section-title{font-size:10pt;font-weight:700;color:#0f2044;letter-spacing:.02em;border-bottom:2px solid #fbbf24;padding-bottom:3px;margin-bottom:8px;}
  .exp-header{display:flex;justify-content:space-between;align-items:baseline;}
  .exp-title{font-weight:700;font-size:9.5pt;}
  .exp-date{font-size:7.5pt;color:#64748b;}
  .exp-company{font-size:8.5pt;color:#475569;margin-bottom:3px;}
  .exp-desc{font-size:8pt;line-height:1.55;white-space:pre-wrap;color:#374151;}
</style></head><body><div class="wrap">
<div class="sidebar">
  <div class="name">${p.firstName}<br>${p.lastName}</div>
  <div class="gold-rule"></div>
  <div class="sb-label">Contact</div>
  ${[p.email,p.phone,p.location,p.linkedinUrl,p.githubUrl,p.portfolioUrl].filter(Boolean).map(v=>`<div class="sb-item">${v}</div>`).join('')}
  ${skills.length?`<div class="sb-label">Skills</div>${skills.map(s=>{const pct=s.level==='EXPERT'?95:s.level==='ADVANCED'?75:s.level==='INTERMEDIATE'?55:35;return`<div class="skill-bar-wrap"><div class="skill-name">${s.name}</div><div class="skill-bar"><div class="skill-fill" style="width:${pct}%"></div></div></div>`;}).join('')}`:''}
  ${certifications.length?`<div class="sb-label">Certifications</div>${certifications.map(c=>`<div class="sb-item">${c.name}</div>`).join('')}`:''}
</div>
<div class="main">
  ${summary?`<div class="section"><div class="section-title">Professional Profile</div><div class="exp-desc">${summary}</div></div>`:''}
  ${experiences.length?`<div class="section"><div class="section-title">Experience</div>${experiences.map(e=>`<div style="margin-bottom:11px"><div class="exp-header"><span class="exp-title">${e.title}</span><span class="exp-date">${formatDate(e.startDate)} – ${e.isCurrent?'Present':formatDate(e.endDate)}</span></div><div class="exp-company">${e.company}${e.location?` · ${e.location}`:''}</div><div class="exp-desc">${e.description}</div></div>`).join('')}</div>`:''}
  ${educations.length?`<div class="section"><div class="section-title">Education</div>${educations.map(e=>`<div style="margin-bottom:7px"><div class="exp-header"><span class="exp-title">${e.institution}</span><span class="exp-date">${formatDate(e.startDate)} – ${formatDate(e.endDate)}</span></div><div class="exp-company">${e.degree}${e.fieldOfStudy?` · ${e.fieldOfStudy}`:''}${e.gpa?` · GPA ${e.gpa}`:''}</div></div>`).join('')}</div>`:''}
</div></div></body></html>`;
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

// ─── Soft (pastel, rounded, approachable) ─────────────────────────────────────

function softTemplate(c: ResumeContent): string {
  const { personalInfo: p, summary, experiences, educations, skills, certifications } = c;
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:9pt;color:#374151;background:#fafaf9;padding:28px 36px;}
  .header{background:linear-gradient(135deg,#ddd6fe,#fbcfe8);border-radius:12px;padding:22px 24px;margin-bottom:20px;}
  h1{font-size:21pt;font-weight:700;color:#4c1d95;}
  .contact-line{font-size:7.5pt;color:#6d28d9;margin-top:5px;opacity:.8;}
  .section{margin-bottom:16px;}
  .section-title{font-size:8pt;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#7c3aed;margin-bottom:8px;}
  .card{background:#fff;border-radius:8px;padding:10px 12px;margin-bottom:7px;box-shadow:0 1px 3px rgba(0,0,0,.07);}
  .exp-header{display:flex;justify-content:space-between;align-items:baseline;}
  .exp-title{font-weight:700;font-size:9.5pt;color:#1f2937;}
  .exp-date{font-size:7.5pt;color:#9ca3af;}
  .exp-company{font-size:8.5pt;color:#6b7280;margin-bottom:3px;}
  .exp-desc{font-size:8pt;line-height:1.55;white-space:pre-wrap;color:#4b5563;}
  .skill-pill{display:inline-block;background:#ede9fe;color:#6d28d9;border-radius:999px;padding:3px 10px;font-size:7.5pt;margin:2px 2px 0 0;}
</style></head><body>
  <div class="header">
    <h1>${p.firstName} ${p.lastName}</h1>
    <div class="contact-line">${[p.email,p.phone,p.location,p.linkedinUrl,p.githubUrl,p.portfolioUrl].filter(Boolean).join(' · ')}</div>
  </div>
  ${summary?`<div class="section"><div class="section-title">About</div><div class="card"><div class="exp-desc">${summary}</div></div></div>`:''}
  ${experiences.length?`<div class="section"><div class="section-title">Experience</div>${experiences.map(e=>`<div class="card"><div class="exp-header"><span class="exp-title">${e.title}</span><span class="exp-date">${formatDate(e.startDate)} – ${e.isCurrent?'Present':formatDate(e.endDate)}</span></div><div class="exp-company">${e.company}${e.location?` · ${e.location}`:''}</div><div class="exp-desc">${e.description}</div></div>`).join('')}</div>`:''}
  ${educations.length?`<div class="section"><div class="section-title">Education</div>${educations.map(e=>`<div class="card"><div class="exp-header"><span class="exp-title">${e.institution}</span><span class="exp-date">${formatDate(e.startDate)} – ${formatDate(e.endDate)}</span></div><div class="exp-company">${e.degree}${e.fieldOfStudy?` · ${e.fieldOfStudy}`:''}${e.gpa?` · GPA ${e.gpa}`:''}</div></div>`).join('')}</div>`:''}
  ${skills.length?`<div class="section"><div class="section-title">Skills</div><div>${skills.map(s=>`<span class="skill-pill">${s.name}</span>`).join('')}</div></div>`:''}
  ${certifications.length?`<div class="section"><div class="section-title">Certifications</div>${certifications.map(c=>`<div class="card" style="padding:6px 12px"><strong>${c.name}</strong> · <span style="color:#6b7280">${c.issuer}</span></div>`).join('')}</div>`:''}
</body></html>`;
}

// ─── Forest (deep green, natural) ────────────────────────────────────────────

function forestTemplate(c: ResumeContent): string {
  const { personalInfo: p, summary, experiences, educations, skills, certifications } = c;
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:9pt;color:#1c2b1e;margin:0;}
  .wrap{display:flex;width:100%;}
  .sidebar{width:200px;min-width:200px;color:#d1fae5;padding:28px 16px;flex-shrink:0;background:#1a3a1c;}
  .main{flex:1;padding:28px 26px;}
  .name{font-size:17pt;font-weight:700;line-height:1.2;color:#a7f3d0;}
  .sb-label{font-size:7pt;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#6ee7b7;margin:16px 0 6px;}
  .sb-label:first-of-type{margin-top:10px;}
  .sb-item{font-size:7.5pt;color:#d1fae5;opacity:.85;margin-bottom:4px;word-break:break-all;}
  .skill-dot{font-size:7.5pt;color:#d1fae5;margin-bottom:3px;opacity:.9;}
  .skill-dot::before{content:'▸ ';}
  .section{margin-bottom:18px;}
  .section-title{font-size:10.5pt;font-weight:700;color:#15803d;border-bottom:2px solid #bbf7d0;padding-bottom:3px;margin-bottom:8px;}
  .exp-header{display:flex;justify-content:space-between;align-items:baseline;}
  .exp-title{font-weight:700;font-size:9.5pt;}
  .exp-date{font-size:7.5pt;color:#4b5563;}
  .exp-company{font-size:8.5pt;color:#374151;margin-bottom:3px;}
  .exp-desc{font-size:8pt;line-height:1.55;white-space:pre-wrap;color:#1f2937;}
  .edu-row{margin-bottom:7px;}
</style></head><body><div class="wrap">
<div class="sidebar">
  <div class="name">${p.firstName}<br>${p.lastName}</div>
  <div class="sb-label">Contact</div>
  ${[p.email,p.phone,p.location,p.linkedinUrl,p.githubUrl,p.portfolioUrl].filter(Boolean).map(v=>`<div class="sb-item">${v}</div>`).join('')}
  ${skills.length?`<div class="sb-label">Skills</div>${skills.map(s=>`<div class="skill-dot">${s.name}</div>`).join('')}`:''}
  ${certifications.length?`<div class="sb-label">Certifications</div>${certifications.map(c=>`<div class="sb-item">${c.name}</div>`).join('')}`:''}
</div>
<div class="main">
  ${summary?`<div class="section"><div class="section-title">Summary</div><div class="exp-desc">${summary}</div></div>`:''}
  ${experiences.length?`<div class="section"><div class="section-title">Experience</div>${experiences.map(e=>`<div style="margin-bottom:11px"><div class="exp-header"><span class="exp-title">${e.title}</span><span class="exp-date">${formatDate(e.startDate)} – ${e.isCurrent?'Present':formatDate(e.endDate)}</span></div><div class="exp-company">${e.company}${e.location?` · ${e.location}`:''}</div><div class="exp-desc">${e.description}</div></div>`).join('')}</div>`:''}
  ${educations.length?`<div class="section"><div class="section-title">Education</div>${educations.map(e=>`<div class="edu-row"><div class="exp-header"><span class="exp-title">${e.institution}</span><span class="exp-date">${formatDate(e.startDate)} – ${formatDate(e.endDate)}</span></div><div class="exp-company">${e.degree}${e.fieldOfStudy?` · ${e.fieldOfStudy}`:''}${e.gpa?` · GPA ${e.gpa}`:''}</div></div>`).join('')}</div>`:''}
</div></div></body></html>`;
}

// ─── Monochrome (stark B&W, high contrast) ────────────────────────────────────

function monochromeTemplate(c: ResumeContent): string {
  const { personalInfo: p, summary, experiences, educations, skills, certifications } = c;
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:9pt;color:#000;padding:32px 44px;background:#fff;}
  .header{background:#000;color:#fff;padding:18px 22px;margin-bottom:20px;}
  h1{font-size:22pt;font-weight:900;letter-spacing:-.02em;}
  .contact-line{font-size:7.5pt;opacity:.7;margin-top:5px;}
  .section{margin-bottom:16px;}
  .section-title{font-size:8pt;font-weight:900;text-transform:uppercase;letter-spacing:.15em;background:#000;color:#fff;padding:2px 8px;display:inline-block;margin-bottom:8px;}
  .exp-header{display:flex;justify-content:space-between;align-items:baseline;}
  .exp-title{font-weight:700;font-size:9.5pt;}
  .exp-date{font-size:7.5pt;color:#555;}
  .exp-company{font-size:8.5pt;color:#333;margin-bottom:3px;}
  .exp-desc{font-size:8pt;line-height:1.55;white-space:pre-wrap;}
  .divider{border:none;border-top:1px solid #000;margin:8px 0;}
  .skill-tag{display:inline-block;border:1.5px solid #000;padding:1px 7px;font-size:7.5pt;margin:2px 2px 0 0;border-radius:2px;}
</style></head><body>
  <div class="header">
    <h1>${p.firstName} ${p.lastName}</h1>
    <div class="contact-line">${[p.email,p.phone,p.location,p.linkedinUrl,p.githubUrl,p.portfolioUrl].filter(Boolean).join(' · ')}</div>
  </div>
  ${summary?`<div class="section"><div class="section-title">Profile</div><div class="exp-desc">${summary}</div></div>`:''}
  ${experiences.length?`<div class="section"><div class="section-title">Experience</div>${experiences.map((e,i)=>`${i>0?'<hr class="divider">':''}<div><div class="exp-header"><span class="exp-title">${e.title}</span><span class="exp-date">${formatDate(e.startDate)} – ${e.isCurrent?'Present':formatDate(e.endDate)}</span></div><div class="exp-company">${e.company}${e.location?` · ${e.location}`:''}</div><div class="exp-desc">${e.description}</div></div>`).join('')}</div>`:''}
  ${educations.length?`<div class="section"><div class="section-title">Education</div>${educations.map(e=>`<div style="margin-bottom:6px"><div class="exp-header"><span class="exp-title">${e.institution}</span><span class="exp-date">${formatDate(e.endDate)}</span></div><div class="exp-company">${e.degree}${e.fieldOfStudy?` · ${e.fieldOfStudy}`:''}</div></div>`).join('')}</div>`:''}
  ${skills.length?`<div class="section"><div class="section-title">Skills</div><div>${skills.map(s=>`<span class="skill-tag">${s.name}</span>`).join('')}</div></div>`:''}
  ${certifications.length?`<div class="section"><div class="section-title">Certifications</div><div class="exp-desc">${certifications.map(c=>`${c.name} (${c.issuer})`).join(' · ')}</div></div>`:''}
</body></html>`;
}

// ─── Sunrise (warm amber gradient header) ────────────────────────────────────

function sunriseTemplate(c: ResumeContent): string {
  const { personalInfo: p, summary, experiences, educations, skills, certifications } = c;
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:9pt;color:#1c1917;background:#fff;}
  .header{background:linear-gradient(120deg,#f59e0b,#ef4444);padding:28px 40px 22px;color:#fff;}
  h1{font-size:22pt;font-weight:800;letter-spacing:-.02em;}
  .contact-bar{display:flex;flex-wrap:wrap;gap:12px;margin-top:7px;font-size:7.5pt;opacity:.9;}
  .body{padding:22px 40px;}
  .two-col{display:grid;grid-template-columns:1fr 200px;gap:24px;}
  .section{margin-bottom:16px;}
  .section-title{font-size:8pt;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#d97706;margin-bottom:8px;display:flex;align-items:center;gap:8px;}
  .section-title::after{content:'';flex:1;height:1px;background:#fde68a;}
  .exp-header{display:flex;justify-content:space-between;align-items:baseline;}
  .exp-title{font-weight:700;font-size:9.5pt;}
  .exp-date{font-size:7.5pt;color:#78716c;}
  .exp-company{font-size:8.5pt;color:#57534e;margin-bottom:3px;}
  .exp-desc{font-size:8pt;line-height:1.55;white-space:pre-wrap;color:#292524;}
  .skill-bar-wrap{margin-bottom:5px;}
  .skill-name{font-size:7.5pt;color:#292524;margin-bottom:2px;}
  .skill-track{height:4px;background:#fef3c7;border-radius:2px;}
  .skill-fill{height:4px;background:#f59e0b;border-radius:2px;}
  .cert-item{font-size:8pt;margin-bottom:4px;padding-left:8px;border-left:2px solid #f59e0b;}
</style></head><body>
<div class="header">
  <h1>${p.firstName} ${p.lastName}</h1>
  <div class="contact-bar">${[p.email,p.phone,p.location,p.linkedinUrl,p.githubUrl,p.portfolioUrl].filter(Boolean).map(v=>`<span>${v}</span>`).join('')}</div>
</div>
<div class="body">
  ${summary?`<div class="section"><div class="section-title">Profile</div><div class="exp-desc">${summary}</div></div>`:''}
  <div class="two-col">
    <div>
      ${experiences.length?`<div class="section"><div class="section-title">Experience</div>${experiences.map(e=>`<div style="margin-bottom:10px"><div class="exp-header"><span class="exp-title">${e.title}</span><span class="exp-date">${formatDate(e.startDate)} – ${e.isCurrent?'Present':formatDate(e.endDate)}</span></div><div class="exp-company">${e.company}${e.location?` · ${e.location}`:''}</div><div class="exp-desc">${e.description}</div></div>`).join('')}</div>`:''}
      ${educations.length?`<div class="section"><div class="section-title">Education</div>${educations.map(e=>`<div style="margin-bottom:7px"><div class="exp-header"><span class="exp-title">${e.institution}</span><span class="exp-date">${formatDate(e.endDate)}</span></div><div class="exp-company">${e.degree}${e.fieldOfStudy?` · ${e.fieldOfStudy}`:''}${e.gpa?` · GPA ${e.gpa}`:''}</div></div>`).join('')}</div>`:''}
    </div>
    <div>
      ${skills.length?`<div class="section"><div class="section-title">Skills</div>${skills.map(s=>{const pct=s.level==='EXPERT'?95:s.level==='ADVANCED'?75:s.level==='INTERMEDIATE'?55:35;return`<div class="skill-bar-wrap"><div class="skill-name">${s.name}</div><div class="skill-track"><div class="skill-fill" style="width:${pct}%"></div></div></div>`;}).join('')}</div>`:''}
      ${certifications.length?`<div class="section"><div class="section-title">Certs</div>${certifications.map(c=>`<div class="cert-item"><strong>${c.name}</strong><br><span style="color:#78716c;font-size:7.5pt">${c.issuer}</span></div>`).join('')}</div>`:''}
    </div>
  </div>
</div></body></html>`;
}

// ─── Registry ─────────────────────────────────────────────────────────────────

const TEMPLATES: Record<string, (c: ResumeContent) => string> = {
  modern: modernTemplate,
  classic: classicTemplate,
  minimal: minimalTemplate,
  executive: executiveTemplate,
  slate: slateTemplate,
  teal: tealTemplate,
  elegant: elegantTemplate,
  creative: creativeTemplate,
  tech: techTemplate,
  gradient: gradientTemplate,
  timeline: timelineTemplate,
  compact: compactTemplate,
  academic: academicTemplate,
  coral: coralTemplate,
  navy: navyTemplate,
  cleanpro: cleanProTemplate,
  soft: softTemplate,
  forest: forestTemplate,
  monochrome: monochromeTemplate,
  sunrise: sunriseTemplate,
};

export function renderTemplate(templateId: string, contentJson: ResumeContent): string {
  const fn = TEMPLATES[templateId] ?? TEMPLATES['modern'];
  return fn(contentJson);
}

export const TEMPLATE_LIST = [
  { id: 'modern',     name: 'Modern',      description: 'Two-column with colored sidebar' },
  { id: 'classic',    name: 'Classic',     description: 'Traditional single-column, serif' },
  { id: 'minimal',    name: 'Minimal',     description: 'Clean with plenty of whitespace' },
  { id: 'executive',  name: 'Executive',   description: 'Bold and compact, high impact' },
  { id: 'slate',      name: 'Slate',       description: 'Dark slate header, clean single-column' },
  { id: 'teal',       name: 'Teal',        description: 'Teal right sidebar, fresh and modern' },
  { id: 'elegant',    name: 'Elegant',     description: 'Centered serif header with decorative rules' },
  { id: 'creative',   name: 'Creative',    description: 'Bold purple accent bar, pill-shaped skills' },
  { id: 'tech',       name: 'Tech',        description: 'Dark theme with monospace code aesthetic' },
  { id: 'gradient',   name: 'Gradient',    description: 'Purple-blue gradient header, SaaS-modern' },
  { id: 'timeline',   name: 'Timeline',    description: 'Vertical timeline for experience, orange accents' },
  { id: 'compact',    name: 'Compact',     description: 'Dense layout that maximises content per page' },
  { id: 'academic',   name: 'Academic',    description: 'CV-style for academia, formal and detailed' },
  { id: 'coral',      name: 'Coral',       description: 'Warm coral accents, two-column sidebar' },
  { id: 'navy',       name: 'Navy',        description: 'Deep navy sidebar with gold skill bars' },
  { id: 'cleanpro',   name: 'Clean Pro',   description: 'Ultra-clean, right-aligned contact stack' },
  { id: 'soft',       name: 'Soft',        description: 'Pastel cards, rounded, approachable feel' },
  { id: 'forest',     name: 'Forest',      description: 'Deep green sidebar, natural and grounded' },
  { id: 'monochrome', name: 'Monochrome',  description: 'Stark black-and-white, high contrast' },
  { id: 'sunrise',    name: 'Sunrise',     description: 'Amber-to-red gradient header, skill bars' },
];
