export type BrandStatus = "freelance" | "organisation";

export type BrandProfile = {
  id: string;
  user_id: string;
  name: string;
  sector: string | null;
  logo_url: string | null;
  primary_color: string | null;
  status: BrandStatus | null;
  website?: string | null;
  socials?: Record<string, string> | null;
  links?: { label: string; url: string }[] | null;
  about?: string | null;
  created_at: string;
};
