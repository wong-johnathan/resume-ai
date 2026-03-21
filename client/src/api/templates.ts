export const getTemplatePdfUrl = (templateId: string) => `/api/templates/${templateId}/pdf`;

export const TEMPLATE_OPTIONS = [
  { value: 'minimal',  label: 'Minimal' },
  { value: 'compact',  label: 'Compact' },
  { value: 'elegant',  label: 'Elegant' },
  { value: 'tech',     label: 'Tech' },
  { value: 'cleanpro', label: 'Clean Pro' },
] as const;
