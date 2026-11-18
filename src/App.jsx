import React, { useEffect, useMemo, useState } from "react";
import { Link, Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, Copy, ExternalLink, Eye, FilePlus2, LogOut,
  MessageCircle, Pencil, Plus, Save, Trash2, Users, Lock, LayoutDashboard
} from "lucide-react";
import { isSupabaseConfigured, supabase } from "./lib/supabase";

const DEFAULT_FIELDS = [
  { id: crypto.randomUUID(), label: "Qual é o seu nome?", type: "text", required: true, placeholder: "Digite seu nome completo" },
  { id: crypto.randomUUID(), label: "Qual é o seu WhatsApp?", type: "phone", required: true, placeholder: "(00) 00000-0000" },
  { id: crypto.randomUUID(), label: "Qual é o nome da sua empresa?", type: "text", required: false, placeholder: "Nome da empresa" },
  { id: crypto.randomUUID(), label: "Qual é o principal desafio da sua empresa?", type: "select", required: true, options: ["Organização das regras internas", "Atrasos e pontualidade", "Uso de celular durante o expediente", "Atualização do Regimento Interno", "Outro"] }
];

function slugify(value) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "formulario";
}
function useSession() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => listener.subscription.unsubscribe();
  }, []);
  return { session, loading };
}
function SetupNotice() {
  return <div className="setup"><div className="setup-mark">⚖</div><h1>Configure seu banco de dados</h1><p>Crie o projeto no Supabase, execute <b>supabase/schema.sql</b> no SQL Editor e preencha as variáveis no arquivo <b>.env</b>. Veja o README.</p></div>;
}
function Login() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(e) {
    e.preventDefault(); setBusy(true); setMessage("");
    const result = mode === "login"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (result.error) setMessage(result.error.message);
    else setMessage(mode === "login" ? "Login realizado." : "Cadastro criado. Se a confirmação de e-mail estiver ativa, confirme seu e-mail antes de entrar.");
  }
  return <main className="auth-wrap"><form className="auth-card" onSubmit={submit}>
    <div className="brand-icon">⚖</div><p className="eyebrow">PAINEL ADMINISTRATIVO</p><h1>{mode === "login" ? "Acesse sua conta" : "Crie sua conta"}</h1>
    <p className="muted">Gerencie formulários e acompanhe os leads recebidos.</p>
    <label>E-mail<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="voce@empresa.com"/></label>
    <label>Senha<input type="password" required minLength="6" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mínimo de 6 caracteres"/></label>
    <button className="btn primary full" disabled={busy}>{busy ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}</button>
    {message && <p className="notice">{message}</p>}
    <button type="button" className="link-button" onClick={()=>setMode(mode === "login" ? "signup" : "login")}>{mode === "login" ? "Ainda não tem conta? Criar conta" : "Já tem conta? Entrar"}</button>
  </form></main>;
}
function Shell({ children, email }) {
  async function logout() { await supabase.auth.signOut(); }
  return <div className="app-shell"><aside className="sidebar"><div className="side-brand"><span>⚖</span><div><b>FORM<span>LEADS</span></b><small>PAINEL DE CAPTAÇÃO</small></div></div><div className="side-label">MENU</div><Link className="side-link active" to="/"><LayoutDashboard size={17}/> Visão geral</Link><div className="side-bottom"><div className="user-pill"><div className="avatar">{(email||"U")[0].toUpperCase()}</div><span>{email}</span></div><button className="side-link logout" onClick={logout}><LogOut size={17}/> Sair</button></div></aside><main className="main-area">{children}</main></div>;
}
function Dashboard() {
  const { session } = useSession();
  const [forms, setForms] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  async function load() {
    setLoading(true);
    const { data } = await supabase.from("forms").select("*").order("created_at", { ascending: false });
    const rows = data || []; setForms(rows);
    const pairs = await Promise.all(rows.map(async f => {
      const { count } = await supabase.from("submissions").select("*", { count: "exact", head: true }).eq("form_id", f.id);
      return [f.id, count || 0];
    }));
    setCounts(Object.fromEntries(pairs)); setLoading(false);
  }
  useEffect(()=>{load();}, []);
  async function createForm() {
    const title = "Novo formulário";
    const slug = `${slugify(title)}-${Math.random().toString(36).slice(2,7)}`;
    const { data, error } = await supabase.from("forms").insert({
      owner_id: session.user.id, title, slug, fields: DEFAULT_FIELDS, is_published: false
    }).select().single();
    if (error) alert(error.message); else navigate(`/editor/${data.id}`);
  }
  async function removeForm(id) {
    if (!confirm("Excluir este formulário e todas as respostas recebidas?")) return;
    const { error } = await supabase.from("forms").delete().eq("id", id);
    if (error) alert(error.message); else load();
  }
  const total = Object.values(counts).reduce((a,b)=>a+b,0);
  return <Shell email={session.user.email}><header className="topbar"><div><p className="eyebrow">SEU NEGÓCIO, SEUS CONTATOS</p><h1>Visão geral</h1><p className="muted">Crie formulários, edite perguntas e acompanhe seus potenciais clientes.</p></div><button className="btn primary" onClick={createForm}><Plus size={17}/> Novo formulário</button></header>
    <section className="stats"><div className="stat-card"><span>Formulários</span><b>{forms.length}</b><small>Total criado</small></div><div className="stat-card"><span>Leads recebidos</span><b>{total}</b><small>Todos os formulários</small></div><div className="stat-card"><span>Publicados</span><b>{forms.filter(f=>f.is_published).length}</b><small>Disponíveis para acesso</small></div></section>
    <div className="section-heading"><div><h2>Seus formulários</h2><p className="muted">Cada formulário pode ter perguntas e identidade próprias.</p></div></div>
    {loading ? <p className="muted">Carregando...</p> : forms.length === 0 ? <div className="empty"><FilePlus2 size={30}/><h3>Você ainda não criou um formulário</h3><p>Comece criando seu primeiro formulário de diagnóstico ou captação.</p><button className="btn primary" onClick={createForm}>Criar primeiro formulário</button></div> :
      <div className="form-grid">{forms.map(f=><article className="form-card" key={f.id}><div className="form-card-top"><span className="form-symbol">▤</span><span className={`status ${f.is_published?"published":"draft"}`}>{f.is_published?"Publicado":"Rascunho"}</span></div><h3>{f.title}</h3><p className="muted clamp">{f.description || "Sem descrição adicionada."}</p><div className="form-meta"><span><Users size={15}/> {counts[f.id] || 0} leads</span><span>{f.fields?.length || 0} perguntas</span></div><div className="card-actions"><button className="btn secondary" onClick={()=>navigate(`/editor/${f.id}`)}><Pencil size={15}/> Editar</button>{f.is_published && <a className="btn ghost" href={`/f/${f.slug}`} target="_blank"><Eye size={15}/> Ver</a>}<button className="icon-btn danger" title="Excluir" onClick={()=>removeForm(f.id)}><Trash2 size={16}/></button></div><button className="text-action" onClick={()=>navigate(`/leads/${f.id}`)}>Ver respostas <ArrowRight size={14}/></button></article>)}</div>}
  </Shell>;
}
function Editor() {
  const { id } = useParams(); const navigate = useNavigate();
  const [form, setForm] = useState(null); const [busy,setBusy] = useState(false); const [tab,setTab] = useState("content");
  useEffect(()=>{supabase.from("forms").select("*").eq("id",id).single().then(({data,error})=>{if(error) alert(error.message); else setForm(data);});},[id]);
  if (!form) return <div className="loading">Carregando editor...</div>;
  const patch = (key,value)=>setForm(old=>({...old,[key]:value}));
  const updateField = (fieldId,key,value)=>patch("fields",form.fields.map(f=>f.id===fieldId?{...f,[key]:value}:f));
  const addField = (type="text")=>patch("fields",[...form.fields,{id:crypto.randomUUID(),label:"Nova pergunta",type,required:false,placeholder:"Digite sua resposta",...(type==="select"?{options:["Opção 1","Opção 2"]}:{})}]);
  const deleteField = fieldId=>patch("fields",form.fields.filter(f=>f.id!==fieldId));
  const save = async (publish=false) => {
    setBusy(true);
    const next = {...form,is_published:publish?true:form.is_published,updated_at:new Date().toISOString(),slug:slugify(form.slug)};
    const {error}=await supabase.from("forms").update(next).eq("id",id);
    setBusy(false); if(error) alert(error.message); else {setForm(next); alert(publish?"Formulário publicado!":"Alterações salvas.");}
  };
  const publicUrl = `${window.location.origin}/f/${form.slug}`;
  return <div className="editor-page"><header className="editor-top"><button className="btn ghost" onClick={()=>navigate("/")}><ArrowLeft size={16}/> Voltar</button><div className="editor-actions"><button className="btn secondary" onClick={()=>navigator.clipboard.writeText(publicUrl)}><Copy size={15}/> Copiar link</button><button className="btn secondary" onClick={()=>save(false)} disabled={busy}><Save size={15}/> Salvar</button><button className="btn primary" onClick={()=>save(true)} disabled={busy}><Eye size={15}/> Publicar</button></div></header>
    <div className="editor-layout"><section className="editor-main"><p className="eyebrow">CONSTRUTOR DE FORMULÁRIO</p><h1>Edite seu formulário</h1><div className="tabs"><button className={tab==="content"?"selected":""} onClick={()=>setTab("content")}>Perguntas e conteúdo</button><button className={tab==="settings"?"selected":""} onClick={()=>setTab("settings")}>Configurações</button></div>
    {tab==="content"? <><div className="panel"><label>Nome interno do formulário<input value={form.title} onChange={e=>patch("title",e.target.value)}/></label><label>Título que o visitante verá<input value={form.public_title || form.title} onChange={e=>patch("public_title",e.target.value)}/></label><label>Texto de apresentação<textarea rows="3" value={form.description} onChange={e=>patch("description",e.target.value)}/></label></div>
    <div className="section-heading"><div><h2>Perguntas</h2><p className="muted">Edite os textos, escolha o tipo de resposta e marque o que é obrigatório.</p></div></div>
    {form.fields.map((field,index)=><div className="question-editor" key={field.id}><div className="question-title"><b>PERGUNTA {index+1}</b><button className="icon-btn danger" onClick={()=>deleteField(field.id)}><Trash2 size={16}/></button></div><label>Texto da pergunta<input value={field.label} onChange={e=>updateField(field.id,"label",e.target.value)}/></label><div className="two-cols"><label>Tipo de resposta<select value={field.type} onChange={e=>updateField(field.id,"type",e.target.value)}><option value="text">Texto curto</option><option value="textarea">Texto longo</option><option value="phone">WhatsApp / telefone</option><option value="email">E-mail</option><option value="select">Lista de opções</option></select></label><label>Texto de ajuda<input value={field.placeholder||""} onChange={e=>updateField(field.id,"placeholder",e.target.value)}/></label></div>{field.type==="select"&&<label>Opções (uma por linha)<textarea rows="4" value={(field.options||[]).join("\n")} onChange={e=>updateField(field.id,"options",e.target.value.split("\n").filter(Boolean))}/></label>}<label className="check"><input type="checkbox" checked={!!field.required} onChange={e=>updateField(field.id,"required",e.target.checked)}/> Resposta obrigatória</label></div>)}
    <div className="add-buttons"><button className="btn secondary" onClick={()=>addField("text")}><Plus size={16}/> Pergunta de texto</button><button className="btn secondary" onClick={()=>addField("select")}><Plus size={16}/> Pergunta com opções</button></div></>:
    <div className="panel"><label>Slug do link<input value={form.slug} onChange={e=>patch("slug",e.target.value)}/><small>Endereço: {window.location.origin}/f/{slugify(form.slug)}</small></label><label>WhatsApp de destino (com DDI e DDD)<input value={form.whatsapp_number} onChange={e=>patch("whatsapp_number",e.target.value)} placeholder="5521999999999"/></label><label>Texto do botão final<input value={form.button_text} onChange={e=>patch("button_text",e.target.value)}/></label><label>Título após envio<input value={form.thank_you_title} onChange={e=>patch("thank_you_title",e.target.value)}/></label><label>Mensagem após envio<textarea rows="3" value={form.thank_you_message} onChange={e=>patch("thank_you_message",e.target.value)}/></label><label className="check"><input type="checkbox" checked={!!form.is_published} onChange={e=>patch("is_published",e.target.checked)}/> Formulário publicado</label></div>}
    </section><aside className="preview"><div className="preview-label"><Eye size={15}/> PRÉVIA</div><div className="preview-card"><div className="preview-brand">⚖ <b>{form.title}</b></div><h2>{form.public_title||form.title}</h2><p>{form.description}</p>{form.fields.map((f,i)=><div className="preview-field" key={f.id}><b>{f.label}</b><div>{f.type==="select"?(f.options||[]).map(o=><span className="preview-option" key={o}>○ {o}</span>):<span className="fake-input">{f.placeholder||"Sua resposta"}</span>}</div></div>)}<div className="fake-submit">{form.button_text}</div></div></aside></div></div>;
}
function PublicForm() {
  const { slug } = useParams(); const [form,setForm]=useState(null); const [values,setValues]=useState({}); const [step,setStep]=useState(0); const [done,setDone]=useState(false); const [busy,setBusy]=useState(false); const [error,setError]=useState("");
  useEffect(()=>{supabase.from("forms").select("*").eq("slug",slug).eq("is_published",true).single().then(({data})=>setForm(data||false));},[slug]);
  if(form===null)return <div className="loading">Carregando formulário...</div>;
  if(form===false)return <div className="setup"><h1>Formulário não encontrado</h1><p>Confira se o link está correto ou se o formulário foi publicado.</p></div>;
  const fields=form.fields||[]; const field=fields[step]; const setValue=(id,value)=>setValues(v=>({...v,[id]:value}));
  function valid(f){const v=values[f.id]||"";return !f.required||String(v).trim().length>0;}
  async function next(e){e.preventDefault();if(!valid(field)){setError("Preencha esta resposta para continuar.");return;}setError("");if(step<fields.length-1){setStep(s=>s+1);return;}await submit();}
  async function submit(){setBusy(true);const {error:err}=await supabase.from("submissions").insert({form_id:form.id,answers:values});setBusy(false);if(err){setError("Não foi possível registrar suas respostas. Tente novamente.");return;}setDone(true);}
  const whatsappField=fields.find(f=>/whats|telefone|celular/i.test(f.label));
  const phoneValue=whatsappField?values[whatsappField.id]:"";
  const wa=form.whatsapp_number?.replace(/\D/g,"");
  const message=encodeURIComponent(`Olá! Preenchi o formulário "${form.title}".\n\n${fields.map(f=>`${f.label}: ${values[f.id]||"Não informado"}`).join("\n")}`);
  const waUrl=wa?`https://wa.me/${wa}?text=${message}`:`https://wa.me/?text=${message}`;
  if(done)return <main className="public-wrap"><div className="public-card success-card"><div className="success-icon">✓</div><p className="eyebrow">RESPOSTAS REGISTRADAS</p><h1>{form.thank_you_title}</h1><p>{form.thank_you_message}</p><a className="btn whatsapp full" href={waUrl} target="_blank" rel="noreferrer"><MessageCircle size={18}/> Continuar pelo WhatsApp</a><small>Seus dados foram enviados para análise.</small></div></main>;
  return <main className="public-wrap"><div className="public-card"><div className="public-brand"><span>⚖</span><b>{form.title}</b><small>ATENDIMENTO EMPRESARIAL</small></div><div className="progress-head"><span>ETAPA {step+1} DE {fields.length}</span><span>{Math.round(((step+1)/Math.max(fields.length,1))*100)}%</span></div><div className="progress"><i style={{width:`${((step+1)/Math.max(fields.length,1))*100}%`}}/></div><p className="eyebrow">FORMULÁRIO DE CONTATO</p><h1>{form.public_title||form.title}</h1><p className="public-description">{form.description}</p><form onSubmit={next}><label className="public-question">{field.label}{field.required&&<em> *</em>}</label>{field.type==="select"?<div className="choices">{(field.options||[]).map(option=><label className={`choice ${values[field.id]===option?"chosen":""}`} key={option}><input type="radio" name={field.id} checked={values[field.id]===option} onChange={()=>setValue(field.id,option)}/><span>{option}</span></label>)}</div>:field.type==="textarea"?<textarea rows="5" required={field.required} placeholder={field.placeholder} value={values[field.id]||""} onChange={e=>setValue(field.id,e.target.value)}/>:<input type={field.type==="email"?"email":"text"} required={field.required} placeholder={field.placeholder} value={values[field.id]||""} onChange={e=>setValue(field.id,e.target.value)}/>}<small className="privacy-note"><Lock size={13}/> Suas informações serão utilizadas para responder ao seu contato.</small>{error&&<p className="error">{error}</p>}<div className="public-actions">{step>0&&<button type="button" className="btn secondary" onClick={()=>setStep(s=>s-1)}><ArrowLeft size={16}/> Voltar</button>}<button className="btn gold" disabled={busy}>{busy?"Enviando...":step===fields.length-1?form.button_text:"Continuar"} <ArrowRight size={16}/></button></div></form><div className="public-footer">Informações protegidas • Atendimento profissional</div></div></main>;
}
function Leads() {
  const {id}=useParams(); const navigate=useNavigate(); const [form,setForm]=useState(null); const [rows,setRows]=useState([]);
  useEffect(()=>{async function load(){const [{data:f},{data:r}]=await Promise.all([supabase.from("forms").select("*").eq("id",id).single(),supabase.from("submissions").select("*").eq("form_id",id).order("created_at",{ascending:false})]);setForm(f);setRows(r||[]);}load();},[id]);
  function exportCsv(){const keys=[...new Set(rows.flatMap(r=>Object.keys(r.answers||{})))];const header=["Data",...keys];const lines=[header,...rows.map(r=>[new Date(r.created_at).toLocaleString("pt-BR"),...keys.map(k=>r.answers?.[k]||"")])];const csv="\uFEFF"+lines.map(line=>line.map(v=>`"${String(v).replaceAll('"','""')}"`).join(";")).join("\n");const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8;"}));a.download=`leads-${form?.slug||"formulario"}.csv`;a.click();URL.revokeObjectURL(a.href);}
  const keys=[...new Set(rows.flatMap(r=>Object.keys(r.answers||{})))];
  return <div className="editor-page"><header className="editor-top"><button className="btn ghost" onClick={()=>navigate("/")}><ArrowLeft size={16}/> Voltar</button><button className="btn primary" onClick={exportCsv}>Exportar CSV</button></header><div className="leads-head"><p className="eyebrow">RESPOSTAS RECEBIDAS</p><h1>{form?.title||"Leads"}</h1><p className="muted">{rows.length} respostas registradas.</p></div><div className="table-wrap"><table><thead><tr><th>Data</th>{keys.map(k=><th key={k}>{form?.fields?.find(f=>f.id===k)?.label||k}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{new Date(r.created_at).toLocaleString("pt-BR")}</td>{keys.map(k=><td key={k}>{r.answers?.[k]||"—"}</td>)}</tr>)}</tbody></table>{rows.length===0&&<div className="empty"><Users size={28}/><h3>Nenhum lead recebido ainda</h3><p>Compartilhe o link do formulário publicado para começar.</p></div>}</div></div>;
}
function Protected({children}) { const {session,loading}=useSession(); if(loading)return <div className="loading">Carregando...</div>; return session?children:<Navigate to="/login" replace/>; }
export default function App() {
  const {session,loading}=useSession();
  if(!isSupabaseConfigured)return <SetupNotice/>;
  return <Routes><Route path="/f/:slug" element={<PublicForm/>}/><Route path="/login" element={session?<Navigate to="/" replace/>:<Login/>}/><Route path="/" element={<Protected><Dashboard/></Protected>}/><Route path="/editor/:id" element={<Protected><Editor/></Protected>}/><Route path="/leads/:id" element={<Protected><Leads/></Protected>}/><Route path="*" element={<Navigate to="/" replace/>}/></Routes>;
}
