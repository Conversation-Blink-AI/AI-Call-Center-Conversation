--
-- PostgreSQL database dump
--

\restrict 06lImX9ijAt9ZN0cf9NjowD4TfYbgtdKzumttJyw2F8aIzZZlzBd9zcg7Z7ojHr

-- Dumped from database version 16.11 (Homebrew)
-- Dumped by pg_dump version 16.11 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.teams DROP CONSTRAINT IF EXISTS teams_owner_id_fkey;
ALTER TABLE IF EXISTS ONLY public.team_members DROP CONSTRAINT IF EXISTS team_members_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.team_members DROP CONSTRAINT IF EXISTS team_members_team_id_fkey;
ALTER TABLE IF EXISTS ONLY public.phone_numbers DROP CONSTRAINT IF EXISTS phone_numbers_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.phone_numbers DROP CONSTRAINT IF EXISTS phone_numbers_pathway_id_fkey;
ALTER TABLE IF EXISTS ONLY public.pathways DROP CONSTRAINT IF EXISTS pathways_updater_id_fkey;
ALTER TABLE IF EXISTS ONLY public.pathways DROP CONSTRAINT IF EXISTS pathways_team_id_fkey;
ALTER TABLE IF EXISTS ONLY public.pathways DROP CONSTRAINT IF EXISTS pathways_creator_id_fkey;
ALTER TABLE IF EXISTS ONLY public.invitations DROP CONSTRAINT IF EXISTS invitations_team_id_fkey;
ALTER TABLE IF EXISTS ONLY public.activities DROP CONSTRAINT IF EXISTS activities_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.activities DROP CONSTRAINT IF EXISTS activities_pathway_id_fkey;
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
DROP TRIGGER IF EXISTS update_teams_updated_at ON public.teams;
DROP TRIGGER IF EXISTS update_team_members_updated_at ON public.teams;
DROP TRIGGER IF EXISTS update_pathways_updated_at ON public.pathways;
DROP INDEX IF EXISTS public.idx_users_email;
DROP INDEX IF EXISTS public.idx_teams_owner_id;
DROP INDEX IF EXISTS public.idx_team_members_user_id;
DROP INDEX IF EXISTS public.idx_team_members_team_id;
DROP INDEX IF EXISTS public.idx_phone_numbers_user_id;
DROP INDEX IF EXISTS public.idx_phone_numbers_pathway_id;
DROP INDEX IF EXISTS public.idx_pathways_team_id;
DROP INDEX IF EXISTS public.idx_pathways_creator_id;
DROP INDEX IF EXISTS public.idx_invitations_token;
DROP INDEX IF EXISTS public.idx_invitations_team_id;
DROP INDEX IF EXISTS public.idx_activities_user_id;
DROP INDEX IF EXISTS public.idx_activities_pathway_id;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE IF EXISTS ONLY public.teams DROP CONSTRAINT IF EXISTS teams_pkey;
ALTER TABLE IF EXISTS ONLY public.team_members DROP CONSTRAINT IF EXISTS team_members_team_id_user_id_key;
ALTER TABLE IF EXISTS ONLY public.team_members DROP CONSTRAINT IF EXISTS team_members_pkey;
ALTER TABLE IF EXISTS ONLY public.phone_numbers DROP CONSTRAINT IF EXISTS phone_numbers_pkey;
ALTER TABLE IF EXISTS ONLY public.phone_numbers DROP CONSTRAINT IF EXISTS phone_numbers_phone_number_key;
ALTER TABLE IF EXISTS ONLY public.pathways DROP CONSTRAINT IF EXISTS pathways_pkey;
ALTER TABLE IF EXISTS ONLY public.invitations DROP CONSTRAINT IF EXISTS invitations_token_key;
ALTER TABLE IF EXISTS ONLY public.invitations DROP CONSTRAINT IF EXISTS invitations_pkey;
ALTER TABLE IF EXISTS ONLY public.activities DROP CONSTRAINT IF EXISTS activities_pkey;
DROP TABLE IF EXISTS public.users;
DROP TABLE IF EXISTS public.teams;
DROP TABLE IF EXISTS public.team_members;
DROP TABLE IF EXISTS public.phone_numbers;
DROP TABLE IF EXISTS public.pathways;
DROP TABLE IF EXISTS public.invitations;
DROP TABLE IF EXISTS public.activities;
DROP FUNCTION IF EXISTS public.update_updated_at_column();
--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: activities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pathway_id uuid NOT NULL,
    user_id uuid NOT NULL,
    action character varying(100) NOT NULL,
    details jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: invitations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invitations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email character varying(255) NOT NULL,
    team_id uuid NOT NULL,
    role character varying(50) DEFAULT 'member'::character varying,
    token character varying(255) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    accepted boolean DEFAULT false
);


--
-- Name: pathways; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pathways (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    team_id uuid NOT NULL,
    creator_id uuid NOT NULL,
    updater_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    data jsonb,
    bland_id character varying(255),
    phone_number character varying(20)
);


--
-- Name: phone_numbers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.phone_numbers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    phone_number character varying(20) NOT NULL,
    user_id uuid NOT NULL,
    pathway_id uuid,
    purchased_at timestamp with time zone DEFAULT now(),
    location character varying(100),
    type character varying(50) DEFAULT 'Local'::character varying,
    status character varying(50) DEFAULT 'Active'::character varying,
    monthly_fee numeric(10,2) DEFAULT 1.00,
    assigned_to character varying(255)
);


--
-- Name: team_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role character varying(50) DEFAULT 'member'::character varying,
    joined_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: teams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.teams (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    owner_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email character varying(255) NOT NULL,
    company character varying(255),
    role character varying(50) DEFAULT 'user'::character varying,
    phone_number character varying(20),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_login timestamp with time zone,
    password_hash character varying(255) NOT NULL,
    first_name character varying(255),
    last_name character varying(255),
    external_id character varying(255),
    external_token text,
    is_verified boolean DEFAULT false,
    platform character varying(50) DEFAULT 'AI Call'::character varying,
    verification_token character varying(255),
    verification_expires_at timestamp with time zone
);


--
-- Data for Name: activities; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.activities (id, pathway_id, user_id, action, details, created_at) FROM stdin;
\.


--
-- Data for Name: invitations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.invitations (id, email, team_id, role, token, expires_at, created_at, accepted) FROM stdin;
\.


--
-- Data for Name: pathways; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.pathways (id, name, description, team_id, creator_id, updater_id, created_at, updated_at, data, bland_id, phone_number) FROM stdin;
\.


--
-- Data for Name: phone_numbers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.phone_numbers (id, phone_number, user_id, pathway_id, purchased_at, location, type, status, monthly_fee, assigned_to) FROM stdin;
4332c37a-31d2-46da-a620-1e535c896c08	+14159407394	ee86a13b-722c-48c9-af13-c6cd75c43ba8	\N	2025-11-25 13:35:52.574161+05:30	Sausalito, CA	Local	Active	15.00	\N
\.


--
-- Data for Name: team_members; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.team_members (id, team_id, user_id, role, joined_at, updated_at) FROM stdin;
\.


--
-- Data for Name: teams; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.teams (id, name, description, owner_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, email, company, role, phone_number, created_at, updated_at, last_login, password_hash, first_name, last_name, external_id, external_token, is_verified, platform, verification_token, verification_expires_at) FROM stdin;
ee86a13b-722c-48c9-af13-c6cd75c43ba8	rikki@blinkdigital.in	\N	client	9920199075	2025-11-24 13:24:52.032505+05:30	2025-11-24 13:26:33.570341+05:30	2025-11-24 13:26:33.570341+05:30	Blink@1234	Rikki	Agarwal	65926f14674a966da6196ebc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY1OTI2ZjE0Njc0YTk2NmRhNjE5NmViYyIsImZpcnN0TmFtZSI6IlJpa2tpIiwibGFzdE5hbWUiOiJBZ2Fyd2FsIiwiZW1haWwiOiJyaWtraUBibGlua2RpZ2l0YWwuaW4iLCJwaG9uZU51bWJlciI6Ijk5MjAxOTkwNzUiLCJyb2xlIjoiY2xpZW50IiwiY29kZSI6IiIsInN0YXR1cyI6ImFjdGl2ZSIsInZlcmlmaWVkIjp0cnVlLCJjcmVhdGVkRGF0ZSI6IjIwMjQtMDEtMDFUMDc6NTE6NDguMTY1WiIsInVwZGF0ZWREYXRlIjoiMjAyNS0wOS0xNVQxNzoyMzo1NS43MjJaIiwiX192IjowLCJwbGF0Zm9ybXMiOlsiSHVzdGxlIiwiTGFuZGVyIiwiQUkgQ2FsbCIsIldoYXRzYXBwIl0sImlhdCI6MTc2Mzk3MDk5MywiZXhwIjoxNzk1NTA2OTkzfQ.nrZJjEDuGw1vSrl3V6LkutKkeucnHI96VoQJW08r5RE	t	AI Call	\N	\N
\.


--
-- Name: activities activities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_pkey PRIMARY KEY (id);


--
-- Name: invitations invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT invitations_pkey PRIMARY KEY (id);


--
-- Name: invitations invitations_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT invitations_token_key UNIQUE (token);


--
-- Name: pathways pathways_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pathways
    ADD CONSTRAINT pathways_pkey PRIMARY KEY (id);


--
-- Name: phone_numbers phone_numbers_phone_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.phone_numbers
    ADD CONSTRAINT phone_numbers_phone_number_key UNIQUE (phone_number);


--
-- Name: phone_numbers phone_numbers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.phone_numbers
    ADD CONSTRAINT phone_numbers_pkey PRIMARY KEY (id);


--
-- Name: team_members team_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_pkey PRIMARY KEY (id);


--
-- Name: team_members team_members_team_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_team_id_user_id_key UNIQUE (team_id, user_id);


--
-- Name: teams teams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_activities_pathway_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activities_pathway_id ON public.activities USING btree (pathway_id);


--
-- Name: idx_activities_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activities_user_id ON public.activities USING btree (user_id);


--
-- Name: idx_invitations_team_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invitations_team_id ON public.invitations USING btree (team_id);


--
-- Name: idx_invitations_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invitations_token ON public.invitations USING btree (token);


--
-- Name: idx_pathways_creator_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pathways_creator_id ON public.pathways USING btree (creator_id);


--
-- Name: idx_pathways_team_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pathways_team_id ON public.pathways USING btree (team_id);


--
-- Name: idx_phone_numbers_pathway_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_phone_numbers_pathway_id ON public.phone_numbers USING btree (pathway_id);


--
-- Name: idx_phone_numbers_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_phone_numbers_user_id ON public.phone_numbers USING btree (user_id);


--
-- Name: idx_team_members_team_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_members_team_id ON public.team_members USING btree (team_id);


--
-- Name: idx_team_members_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_members_user_id ON public.team_members USING btree (user_id);


--
-- Name: idx_teams_owner_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teams_owner_id ON public.teams USING btree (owner_id);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: pathways update_pathways_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_pathways_updated_at BEFORE UPDATE ON public.pathways FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: teams update_team_members_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_team_members_updated_at BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: teams update_teams_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: activities activities_pathway_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_pathway_id_fkey FOREIGN KEY (pathway_id) REFERENCES public.pathways(id) ON DELETE CASCADE;


--
-- Name: activities activities_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: invitations invitations_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT invitations_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: pathways pathways_creator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pathways
    ADD CONSTRAINT pathways_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: pathways pathways_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pathways
    ADD CONSTRAINT pathways_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: pathways pathways_updater_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pathways
    ADD CONSTRAINT pathways_updater_id_fkey FOREIGN KEY (updater_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: phone_numbers phone_numbers_pathway_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.phone_numbers
    ADD CONSTRAINT phone_numbers_pathway_id_fkey FOREIGN KEY (pathway_id) REFERENCES public.pathways(id) ON DELETE SET NULL;


--
-- Name: phone_numbers phone_numbers_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.phone_numbers
    ADD CONSTRAINT phone_numbers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: team_members team_members_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: team_members team_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: teams teams_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict 06lImX9ijAt9ZN0cf9NjowD4TfYbgtdKzumttJyw2F8aIzZZlzBd9zcg7Z7ojHr

