export type Gender = "MALE" | "FEMALE" | "OTHER";

export interface Profile {
  id: string;
  full_name: string;
  phone_number: string;
  date_of_birth: string | null;
  gender: Gender | null;
  profile_picture_url: string | null;
  created_at: string;
  updated_at: string;
}
