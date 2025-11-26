--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9
-- Dumped by pg_dump version 16.9

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

--
-- Name: current_user_id(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.current_user_id() RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  -- In a real implementation, this would extract user ID from JWT or session
  -- For now, we'll use a simple approach
  RETURN current_setting('app.current_user_id', true)::UUID;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;


ALTER FUNCTION public.current_user_id() OWNER TO neondb_owner;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO neondb_owner;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: activities; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.activities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pathway_id uuid NOT NULL,
    user_id uuid NOT NULL,
    action character varying(100) NOT NULL,
    details jsonb,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.activities OWNER TO neondb_owner;

--
-- Name: call_logs; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.call_logs (
    id bigint NOT NULL,
    subscription_id bigint NOT NULL,
    call_id text NOT NULL,
    duration_sec integer NOT NULL,
    cost_cents bigint NOT NULL,
    logged_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.call_logs OWNER TO neondb_owner;

--
-- Name: call_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.call_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.call_logs_id_seq OWNER TO neondb_owner;

--
-- Name: call_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.call_logs_id_seq OWNED BY public.call_logs.id;


--
-- Name: invitations; Type: TABLE; Schema: public; Owner: neondb_owner
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


ALTER TABLE public.invitations OWNER TO neondb_owner;

--
-- Name: number_subscriptions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.number_subscriptions (
    id bigint NOT NULL,
    user_id uuid NOT NULL,
    phone_number character varying NOT NULL,
    paypal_sub_id text NOT NULL,
    status text NOT NULL,
    next_billing_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.number_subscriptions OWNER TO neondb_owner;

--
-- Name: number_subscriptions_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.number_subscriptions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.number_subscriptions_id_seq OWNER TO neondb_owner;

--
-- Name: number_subscriptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.number_subscriptions_id_seq OWNED BY public.number_subscriptions.id;


--
-- Name: pathways; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.pathways (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    team_id uuid,
    creator_id uuid NOT NULL,
    updater_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    data jsonb,
    phone_number_id uuid NOT NULL,
    pathway_id uuid
);


ALTER TABLE public.pathways OWNER TO neondb_owner;

--
-- Name: phone_numbers; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.phone_numbers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    purchased_at timestamp with time zone DEFAULT now(),
    pathway_id uuid,
    location character varying,
    subscription_plan money,
    phone_number character varying
);


ALTER TABLE public.phone_numbers OWNER TO neondb_owner;

--
-- Name: team_members; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.team_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role character varying(50) DEFAULT 'member'::character varying,
    joined_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.team_members OWNER TO neondb_owner;

--
-- Name: teams; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.teams (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    owner_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.teams OWNER TO neondb_owner;

--
-- Name: users; Type: TABLE; Schema: public; Owner: neondb_owner
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
    first_name character varying,
    last_name character varying,
    external_id character varying(255),
    external_token text,
    is_verified boolean DEFAULT false,
    platform character varying(50) DEFAULT 'AI Call'::character varying
);


ALTER TABLE public.users OWNER TO neondb_owner;

--
-- Name: wallet_transactions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.wallet_transactions (
    id bigint NOT NULL,
    wallet_id bigint NOT NULL,
    amount_cents bigint NOT NULL,
    type text NOT NULL,
    provider_txn_id text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.wallet_transactions OWNER TO neondb_owner;

--
-- Name: wallet_transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.wallet_transactions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.wallet_transactions_id_seq OWNER TO neondb_owner;

--
-- Name: wallet_transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.wallet_transactions_id_seq OWNED BY public.wallet_transactions.id;


--
-- Name: wallets; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.wallets (
    id bigint NOT NULL,
    user_id uuid NOT NULL,
    balance_cents bigint DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.wallets OWNER TO neondb_owner;

--
-- Name: wallets_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.wallets_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.wallets_id_seq OWNER TO neondb_owner;

--
-- Name: wallets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.wallets_id_seq OWNED BY public.wallets.id;


--
-- Name: call_logs id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.call_logs ALTER COLUMN id SET DEFAULT nextval('public.call_logs_id_seq'::regclass);


--
-- Name: number_subscriptions id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.number_subscriptions ALTER COLUMN id SET DEFAULT nextval('public.number_subscriptions_id_seq'::regclass);


--
-- Name: wallet_transactions id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.wallet_transactions ALTER COLUMN id SET DEFAULT nextval('public.wallet_transactions_id_seq'::regclass);


--
-- Name: wallets id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.wallets ALTER COLUMN id SET DEFAULT nextval('public.wallets_id_seq'::regclass);


--
-- Data for Name: activities; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.activities (id, pathway_id, user_id, action, details, created_at) FROM stdin;
\.


--
-- Data for Name: call_logs; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.call_logs (id, subscription_id, call_id, duration_sec, cost_cents, logged_at, created_at) FROM stdin;
\.


--
-- Data for Name: invitations; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.invitations (id, email, team_id, role, token, expires_at, created_at, accepted) FROM stdin;
aa0e8400-e29b-41d4-a716-446655440001	newuser@example.com	660e8400-e29b-41d4-a716-446655440001	developer	inv_token_001	2025-08-07 06:16:48.000658+00	2025-07-31 06:16:48.000658+00	f
aa0e8400-e29b-41d4-a716-446655440002	contractor@freelance.com	660e8400-e29b-41d4-a716-446655440002	member	inv_token_002	2025-08-03 06:16:48.000658+00	2025-07-31 06:16:48.000658+00	f
\.


--
-- Data for Name: number_subscriptions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.number_subscriptions (id, user_id, phone_number, paypal_sub_id, status, next_billing_at, created_at) FROM stdin;
\.


--
-- Data for Name: pathways; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.pathways (id, name, description, team_id, creator_id, updater_id, created_at, updated_at, data, phone_number_id, pathway_id) FROM stdin;
b08231bb-71a6-4668-98fe-ac5dc6cc1cda	Default Pathway for +14158552898	Created via Bland.ai sync	\N	f42a2757-ccb6-4f1e-ab99-56769b12089c	\N	2025-08-04 12:41:24.944751+00	2025-08-04 12:41:24.944751+00	{}	1f35d715-68bb-4c40-b90e-0360b4abec47	5d1af98b-6984-4903-a7b3-f2e2e1fe5d20
\.


--
-- Data for Name: phone_numbers; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.phone_numbers (id, user_id, purchased_at, pathway_id, location, subscription_plan, phone_number) FROM stdin;
1f35d715-68bb-4c40-b90e-0360b4abec47	f42a2757-ccb6-4f1e-ab99-56769b12089c	2025-07-31 04:07:58.852887+00	5d1af98b-6984-4903-a7b3-f2e2e1fe5d20	San Rafael, CA	$15.00	+14158552898\n
\.


--
-- Data for Name: team_members; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.team_members (id, team_id, user_id, role, joined_at, updated_at) FROM stdin;
770e8400-e29b-41d4-a716-446655440001	660e8400-e29b-41d4-a716-446655440001	550e8400-e29b-41d4-a716-446655440002	developer	2025-07-31 06:16:47.265352+00	2025-07-31 06:16:47.265352+00
770e8400-e29b-41d4-a716-446655440002	660e8400-e29b-41d4-a716-446655440001	550e8400-e29b-41d4-a716-446655440003	manager	2025-07-31 06:16:47.265352+00	2025-07-31 06:16:47.265352+00
770e8400-e29b-41d4-a716-446655440003	660e8400-e29b-41d4-a716-446655440002	550e8400-e29b-41d4-a716-446655440001	admin	2025-07-31 06:16:47.265352+00	2025-07-31 06:16:47.265352+00
\.


--
-- Data for Name: teams; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.teams (id, name, description, owner_id, created_at, updated_at) FROM stdin;
9a1cb1fa-2e3b-46be-b6d6-950698cf4b82	Default Team	Auto-created during migration	f42a2757-ccb6-4f1e-ab99-56769b12089c	2025-07-28 13:52:20.00923+00	2025-07-28 13:52:20.00923+00
660e8400-e29b-41d4-a716-446655440001	Engineering Team	Main development team	550e8400-e29b-41d4-a716-446655440001	2025-07-31 06:16:47.017509+00	2025-07-31 06:16:47.017509+00
660e8400-e29b-41d4-a716-446655440002	Sales Team	Customer acquisition team	550e8400-e29b-41d4-a716-446655440002	2025-07-31 06:16:47.017509+00	2025-07-31 06:16:47.017509+00
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.users (id, email, company, role, phone_number, created_at, updated_at, last_login, password_hash, first_name, last_name, external_id, external_token, is_verified, platform) FROM stdin;
fa65a9ee-511f-4fb7-849c-bdb815d027ef	ashishk.expo@gmail.com	Blink	client	+918879613417	2025-08-13 10:39:59.747118+00	2025-08-13 11:43:51.273292+00	2025-08-13 11:43:51.273292+00	Shubham@12	Ashish	Expo	689c5e7028f0b2007b9f4e18	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4OWM1ZTcwMjhmMGIyMDA3YjlmNGUxOCIsImZpcnN0TmFtZSI6IkFzaGlzaCIsImxhc3ROYW1lIjoiRXhwbyIsImVtYWlsIjoiYXNoaXNoay5leHBvQGdtYWlsLmNvbSIsInBob25lTnVtYmVyIjoiKzkxODg3OTYxMzQxNyIsInJvbGUiOiJjbGllbnQiLCJjb2RlIjoiMTU1ODJlNWMwZWYxNWJmZmMyYjlhM2U5YzkzNmVlYzA2ZDQxNTZmYSIsInN0YXR1cyI6ImFjdGl2ZSIsInZlcmlmaWVkIjp0cnVlLCJwbGF0Zm9ybXMiOlsiSHVzdGxlIiwiTGFuZGVyIiwiQUkgQ2FsbCIsIldoYXRzYXBwIl0sImNyZWF0ZWREYXRlIjoiMjAyNS0wOC0xM1QwOTo0NDoxNi45NjRaIiwidXBkYXRlZERhdGUiOiIyMDI1LTA4LTEzVDExOjI2OjUwLjg4OVoiLCJfX3YiOjAsImlhdCI6MTc1NTA4NTQyOSwiZXhwIjoxNzg2NjIxNDI5fQ.M7iMUtVFsvz-mmGdbDWBKEtGhATFdARliRo9FQyLQ3I	t	AI Call
6a654a80-0abb-43c7-abc7-b94154a8a75a	tiwarishubham026@gmail.com	\N	user	+918879613417	2025-05-22 09:27:08.734+00	2025-08-13 09:26:42.282132+00	\N	$2b$10$defaulthash	Shubham	Tiwari	\N	\N	f	AI Call
fa15c960-c008-42d5-be0f-0b9f2c229ea1	shubham.t@blinkdigital.in	\N	user	\N	2025-05-22 07:53:00.152+00	2025-08-13 09:26:42.282132+00	\N	$2b$10$defaulthash	Shubham	Tiwari	\N	\N	f	AI Call
2279232d-357c-411b-87e3-6f832439ea78	anmolj@meta.com	Meta	user	\N	2025-07-15 10:04:31.321676+00	2025-08-13 09:26:42.282132+00	\N	$2b$10$defaulthash	Anmol		\N	\N	f	AI Call
08cc9b6e-5dbe-476a-8f7d-f2ab6a415c71	abhinav@blinkdigital.in	\N	user	\N	2025-07-21 05:51:29.015477+00	2025-08-13 09:26:42.282132+00	\N	$2b$10$defaulthash	Abhinav	Das	\N	\N	f	AI Call
877f6259-c6a8-413f-acdb-d69c0bb3d05e	test2@gmail.com	\N	user	\N	2025-07-04 09:49:57.616083+00	2025-08-13 09:26:42.282132+00	\N	$2b$10$defaulthash	Aman		\N	\N	f	AI Call
730373cb-475d-445e-9ed7-0261bfa4440d	chinar@blinkdigital.in	Blink Digital	user	8796919578	2025-07-04 09:49:57.616083+00	2025-08-13 09:26:42.282132+00	\N	$2b$10$defaulthash	Chinar	Patil	\N	\N	f	AI Call
d7f437c5-79ca-414c-9d82-ab6f8f4cc622	amangupta6276@gmail.com	\N	user	\N	2025-07-04 09:49:57.616083+00	2025-08-13 09:26:42.282132+00	\N	$2b$10$defaulthash	aman		\N	\N	f	AI Call
951ab71f-bb70-4926-af9c-732277618f87	aman.g@blinkdigital.in	a	user	\N	2025-07-04 09:49:57.616083+00	2025-08-13 09:26:42.282132+00	\N	$2b$10$defaulthash	aman		\N	\N	f	AI Call
13c4801e-dfe9-425a-8761-76e855260607	rikki@blinkdigital.in	Blink Digital 	user	\N	2025-07-04 09:49:57.616083+00	2025-08-13 09:26:42.282132+00	\N	$2b$10$defaulthash	rikki		\N	\N	f	AI Call
b5614a05-261a-4689-8dbb-56f99ab2378e	test@test12.com	\N	user	\N	2025-07-18 00:30:28.182304+00	2025-08-13 09:26:42.282132+00	\N	$2b$10$defaulthash	gykjjnk		\N	\N	f	AI Call
83dfc5f7-6789-4c41-8717-4de3ee23c2a0	abhinav.d@blinkdigital.in	Blink DIgital	user	‪+91 93243 52784‬	2025-07-04 09:49:57.616083+00	2025-08-13 09:26:42.282132+00	\N	$2b$10$defaulthash	Abhinav	Das	\N	\N	f	AI Call
f42a2757-ccb6-4f1e-ab99-56769b12089c	test1@gmail.com	\N	user	1234856574	2025-05-22 10:00:26.611+00	2025-08-13 09:26:42.282132+00	2025-08-07 12:25:07.8309+00	Shubham@12	Test1		\N	\N	f	AI Call
550e8400-e29b-41d4-a716-446655440001	admin@replit.com	Replit Inc	admin	+1-555-0101	2025-07-31 06:16:46.75365+00	2025-08-13 09:26:42.282132+00	\N	$2b$12$y6c4Jgrby9iubbs7./xDWOwsR5FZM3oOX49NG49kOj0uXOjHVmZri	Admin	User	\N	\N	f	AI Call
550e8400-e29b-41d4-a716-446655440002	user@test.com	Test Company	user	+1-555-0102	2025-07-31 06:16:46.75365+00	2025-08-13 09:26:42.282132+00	\N	$2b$12$y6c4Jgrby9iubbs7./xDWOwsR5FZM3oOX49NG49kOj0uXOjHVmZri	Test	User	\N	\N	f	AI Call
550e8400-e29b-41d4-a716-446655440003	manager@example.com	Example Corp	manager	+1-555-0103	2025-07-31 06:16:46.75365+00	2025-08-13 09:26:42.282132+00	\N	$2b$12$y6c4Jgrby9iubbs7./xDWOwsR5FZM3oOX49NG49kOj0uXOjHVmZri	Manager	User	\N	\N	f	AI Call
da11cbf0-6456-41ad-84a5-b7954a983da2	tiwarirajesh290@gmai.com	Blink	user	+918879613417	2025-08-13 10:31:23.873313+00	2025-08-13 10:31:23.873313+00	\N	Shubham@12	Ashish	Expo	689c6977d8c9aabc0a47d4a8	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4OWM2OTc3ZDhjOWFhYmMwYTQ3ZDRhOCIsImZpcnN0TmFtZSI6IkFzaGlzaCIsImxhc3ROYW1lIjoiRXhwbyIsImVtYWlsIjoidGl3YXJpcmFqZXNoMjkwQGdtYWkuY29tIiwicGhvbmVOdW1iZXIiOiIrOTE4ODc5NjEzNDE3Iiwicm9sZSI6ImNsaWVudCIsImNvZGUiOiIxZTgwMjM2MjE2ZGY1ZmEyOGU5NTEwZWNlY2U3MmU2OTAzMzIyNTU3Iiwic3RhdHVzIjoiYWN0aXZlIiwidmVyaWZpZWQiOmZhbHNlLCJwbGF0Zm9ybXMiOlsiQUkgQ2FsbCJdLCJjcmVhdGVkRGF0ZSI6IjIwMjUtMDgtMTNUMTA6MzE6MTkuMzYzWiIsInVwZGF0ZWREYXRlIjoiMjAyNS0wOC0xM1QxMDozMToxOS4zNjNaIiwiX192IjowLCJpYXQiOjE3NTUwODEwNzksImV4cCI6MTc4NjYxNzA3OX0.vqxexnI2wCAdda2hIHU8vaMrJ2DDdF2sOAgDnEVrbN0	f	AI Call
\.


--
-- Data for Name: wallet_transactions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.wallet_transactions (id, wallet_id, amount_cents, type, provider_txn_id, metadata, created_at) FROM stdin;
\.


--
-- Data for Name: wallets; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.wallets (id, user_id, balance_cents, updated_at) FROM stdin;
\.


--
-- Name: call_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.call_logs_id_seq', 1, false);


--
-- Name: number_subscriptions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.number_subscriptions_id_seq', 1, false);


--
-- Name: wallet_transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.wallet_transactions_id_seq', 1, false);


--
-- Name: wallets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.wallets_id_seq', 1, false);


--
-- Name: activities activities_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_pkey PRIMARY KEY (id);


--
-- Name: call_logs call_logs_call_id_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.call_logs
    ADD CONSTRAINT call_logs_call_id_key UNIQUE (call_id);


--
-- Name: call_logs call_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.call_logs
    ADD CONSTRAINT call_logs_pkey PRIMARY KEY (id);


--
-- Name: invitations invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT invitations_pkey PRIMARY KEY (id);


--
-- Name: invitations invitations_token_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT invitations_token_key UNIQUE (token);


--
-- Name: number_subscriptions number_subscriptions_paypal_sub_id_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.number_subscriptions
    ADD CONSTRAINT number_subscriptions_paypal_sub_id_key UNIQUE (paypal_sub_id);


--
-- Name: number_subscriptions number_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.number_subscriptions
    ADD CONSTRAINT number_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: pathways pathways_pathway_id_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.pathways
    ADD CONSTRAINT pathways_pathway_id_key UNIQUE (pathway_id);


--
-- Name: pathways pathways_phone_number_id_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.pathways
    ADD CONSTRAINT pathways_phone_number_id_key UNIQUE (phone_number_id);


--
-- Name: pathways pathways_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.pathways
    ADD CONSTRAINT pathways_pkey PRIMARY KEY (id);


--
-- Name: phone_numbers phone_numbers_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.phone_numbers
    ADD CONSTRAINT phone_numbers_pkey PRIMARY KEY (id);


--
-- Name: team_members team_members_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_pkey PRIMARY KEY (id);


--
-- Name: team_members team_members_team_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_team_id_user_id_key UNIQUE (team_id, user_id);


--
-- Name: teams teams_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: wallet_transactions wallet_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_pkey PRIMARY KEY (id);


--
-- Name: wallets wallets_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_pkey PRIMARY KEY (id);


--
-- Name: idx_activities_pathway_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_activities_pathway_id ON public.activities USING btree (pathway_id);


--
-- Name: idx_activities_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_activities_user_id ON public.activities USING btree (user_id);


--
-- Name: idx_calls_subscription_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_calls_subscription_id ON public.call_logs USING btree (subscription_id);


--
-- Name: idx_invitations_team_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_invitations_team_id ON public.invitations USING btree (team_id);


--
-- Name: idx_invitations_token; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_invitations_token ON public.invitations USING btree (token);


--
-- Name: idx_pathways_creator_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_pathways_creator_id ON public.pathways USING btree (creator_id);


--
-- Name: idx_pathways_phone_number_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_pathways_phone_number_id ON public.pathways USING btree (phone_number_id);


--
-- Name: idx_pathways_team_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_pathways_team_id ON public.pathways USING btree (team_id);


--
-- Name: idx_phone_numbers_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_phone_numbers_user_id ON public.phone_numbers USING btree (user_id);


--
-- Name: idx_subs_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_subs_user_id ON public.number_subscriptions USING btree (user_id);


--
-- Name: idx_team_members_team_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_team_members_team_id ON public.team_members USING btree (team_id);


--
-- Name: idx_team_members_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_team_members_user_id ON public.team_members USING btree (user_id);


--
-- Name: idx_teams_owner_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_teams_owner_id ON public.teams USING btree (owner_id);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_wallets_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_wallets_user_id ON public.wallets USING btree (user_id);


--
-- Name: pathways update_pathways_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER update_pathways_updated_at BEFORE UPDATE ON public.pathways FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: team_members update_team_members_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER update_team_members_updated_at BEFORE UPDATE ON public.team_members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: teams update_teams_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: activities activities_pathway_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_pathway_id_fkey FOREIGN KEY (pathway_id) REFERENCES public.pathways(id) ON DELETE CASCADE;


--
-- Name: activities activities_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: call_logs call_logs_subscription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.call_logs
    ADD CONSTRAINT call_logs_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.number_subscriptions(id) ON DELETE CASCADE;


--
-- Name: invitations invitations_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT invitations_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: number_subscriptions number_subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.number_subscriptions
    ADD CONSTRAINT number_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: pathways pathways_creator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.pathways
    ADD CONSTRAINT pathways_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: pathways pathways_phone_number_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.pathways
    ADD CONSTRAINT pathways_phone_number_id_fkey FOREIGN KEY (phone_number_id) REFERENCES public.phone_numbers(id) ON DELETE CASCADE;


--
-- Name: pathways pathways_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.pathways
    ADD CONSTRAINT pathways_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: pathways pathways_updater_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.pathways
    ADD CONSTRAINT pathways_updater_id_fkey FOREIGN KEY (updater_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: phone_numbers phone_numbers_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.phone_numbers
    ADD CONSTRAINT phone_numbers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: team_members team_members_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: team_members team_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: teams teams_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: wallet_transactions wallet_transactions_wallet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.wallets(id) ON DELETE CASCADE;


--
-- Name: wallets wallets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: pathways Pathway creators and team owners can update pathways; Type: POLICY; Schema: public; Owner: neondb_owner
--

CREATE POLICY "Pathway creators and team owners can update pathways" ON public.pathways FOR UPDATE USING (((creator_id = public.current_user_id()) OR (team_id IN ( SELECT teams.id
   FROM public.teams
  WHERE (teams.owner_id = public.current_user_id())))));


--
-- Name: teams Team owners can delete teams; Type: POLICY; Schema: public; Owner: neondb_owner
--

CREATE POLICY "Team owners can delete teams" ON public.teams FOR DELETE USING ((owner_id = public.current_user_id()));


--
-- Name: teams Team owners can update teams; Type: POLICY; Schema: public; Owner: neondb_owner
--

CREATE POLICY "Team owners can update teams" ON public.teams FOR UPDATE USING ((owner_id = public.current_user_id()));


--
-- Name: pathways Users can create pathways; Type: POLICY; Schema: public; Owner: neondb_owner
--

CREATE POLICY "Users can create pathways" ON public.pathways FOR INSERT WITH CHECK ((creator_id = public.current_user_id()));


--
-- Name: phone_numbers Users can delete own phone numbers; Type: POLICY; Schema: public; Owner: neondb_owner
--

CREATE POLICY "Users can delete own phone numbers" ON public.phone_numbers FOR DELETE USING ((user_id = public.current_user_id()));


--
-- Name: phone_numbers Users can insert own phone numbers; Type: POLICY; Schema: public; Owner: neondb_owner
--

CREATE POLICY "Users can insert own phone numbers" ON public.phone_numbers FOR INSERT WITH CHECK ((user_id = public.current_user_id()));


--
-- Name: phone_numbers Users can update own phone numbers; Type: POLICY; Schema: public; Owner: neondb_owner
--

CREATE POLICY "Users can update own phone numbers" ON public.phone_numbers FOR UPDATE USING ((user_id = public.current_user_id()));


--
-- Name: users Users can update own profile; Type: POLICY; Schema: public; Owner: neondb_owner
--

CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING ((id = public.current_user_id()));


--
-- Name: pathways Users can view accessible pathways; Type: POLICY; Schema: public; Owner: neondb_owner
--

CREATE POLICY "Users can view accessible pathways" ON public.pathways FOR SELECT USING (((creator_id = public.current_user_id()) OR (team_id IN ( SELECT team_members.team_id
   FROM public.team_members
  WHERE (team_members.user_id = public.current_user_id()))) OR (team_id IN ( SELECT teams.id
   FROM public.teams
  WHERE (teams.owner_id = public.current_user_id())))));


--
-- Name: invitations Users can view invitations sent to them; Type: POLICY; Schema: public; Owner: neondb_owner
--

CREATE POLICY "Users can view invitations sent to them" ON public.invitations FOR SELECT USING ((((email)::text = (( SELECT users.email
   FROM public.users
  WHERE (users.id = public.current_user_id())))::text) OR (team_id IN ( SELECT teams.id
   FROM public.teams
  WHERE (teams.owner_id = public.current_user_id())))));


--
-- Name: phone_numbers Users can view own phone numbers; Type: POLICY; Schema: public; Owner: neondb_owner
--

CREATE POLICY "Users can view own phone numbers" ON public.phone_numbers FOR SELECT USING ((user_id = public.current_user_id()));


--
-- Name: users Users can view own profile; Type: POLICY; Schema: public; Owner: neondb_owner
--

CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING ((id = public.current_user_id()));


--
-- Name: activities Users can view pathway activities; Type: POLICY; Schema: public; Owner: neondb_owner
--

CREATE POLICY "Users can view pathway activities" ON public.activities FOR SELECT USING ((pathway_id IN ( SELECT pathways.id
   FROM public.pathways
  WHERE ((pathways.creator_id = public.current_user_id()) OR (pathways.team_id IN ( SELECT team_members.team_id
           FROM public.team_members
          WHERE (team_members.user_id = public.current_user_id()))) OR (pathways.team_id IN ( SELECT teams.id
           FROM public.teams
          WHERE (teams.owner_id = public.current_user_id())))))));


--
-- Name: team_members Users can view team memberships; Type: POLICY; Schema: public; Owner: neondb_owner
--

CREATE POLICY "Users can view team memberships" ON public.team_members FOR SELECT USING (((user_id = public.current_user_id()) OR (team_id IN ( SELECT teams.id
   FROM public.teams
  WHERE (teams.owner_id = public.current_user_id())))));


--
-- Name: teams Users can view teams they own or are members of; Type: POLICY; Schema: public; Owner: neondb_owner
--

CREATE POLICY "Users can view teams they own or are members of" ON public.teams FOR SELECT USING (((owner_id = public.current_user_id()) OR (id IN ( SELECT team_members.team_id
   FROM public.team_members
  WHERE (team_members.user_id = public.current_user_id())))));


--
-- Name: activities; Type: ROW SECURITY; Schema: public; Owner: neondb_owner
--

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

--
-- Name: invitations; Type: ROW SECURITY; Schema: public; Owner: neondb_owner
--

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

--
-- Name: pathways; Type: ROW SECURITY; Schema: public; Owner: neondb_owner
--

ALTER TABLE public.pathways ENABLE ROW LEVEL SECURITY;

--
-- Name: phone_numbers; Type: ROW SECURITY; Schema: public; Owner: neondb_owner
--

ALTER TABLE public.phone_numbers ENABLE ROW LEVEL SECURITY;

--
-- Name: team_members; Type: ROW SECURITY; Schema: public; Owner: neondb_owner
--

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

--
-- Name: teams; Type: ROW SECURITY; Schema: public; Owner: neondb_owner
--

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: neondb_owner
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES TO neon_superuser WITH GRANT OPTION;


--
-- PostgreSQL database dump complete
--

