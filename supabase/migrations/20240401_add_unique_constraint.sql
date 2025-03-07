-- Add unique constraint to auth_user_id in twins table
ALTER TABLE public.twins
ADD CONSTRAINT twins_auth_user_id_unique UNIQUE (auth_user_id)
DEFERRABLE INITIALLY DEFERRED; 