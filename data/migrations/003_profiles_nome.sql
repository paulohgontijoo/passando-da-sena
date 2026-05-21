BEGIN;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nome text;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, nickname, telefone, role, nome)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'nickname',
    NEW.raw_user_meta_data->>'telefone',
    COALESCE(
      (NEW.raw_user_meta_data->>'role')::public.user_role,
      'apostador'::public.user_role
    ),
    NEW.raw_user_meta_data->>'nome'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

COMMIT;
