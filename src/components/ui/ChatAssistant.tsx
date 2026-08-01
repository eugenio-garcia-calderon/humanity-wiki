import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useHelpers } from '../../contexts/DataContext';
import { useEdit } from '../../contexts/EditContext';
import { useAuth } from '../../contexts/AuthContext';

export function ChatAssistant() {
  const { challenges, solutions, territories, objectives, saveEntity, refetchData } = useHelpers();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { triggerUpdate } = useEdit();
  const { user } = useAuth();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const newMsg = { role: 'user', text: input };
    setMessages(prev => [...prev, newMsg]);
    setInput('');
    setLoading(true);

    try {
      const dbContext = JSON.stringify({
        territories: territories.map(t => ({ id: t.id, name: t.name, type: t.type, description: t.description })),
        challenges: challenges.map(c => ({ id: c.id, title: c.title, scope: c.scope, objectives: c.objectives, territory_ids: c.territory_ids })),
        solutions: solutions.map(s => ({ id: s.id, title: s.title, type: s.type })),
        objectives: objectives.map(o => ({ id: o.id, title: o.title }))
      });

      const systemInstruction = `Eres el asistente virtual de la aplicación Red Humana.
Puedes ayudar a los usuarios a consultar información de la base de datos o a añadir/modificar registros.
Utiliza las herramientas disponibles para añadir retos, soluciones o modificar territorios cuando el usuario lo solicite. Si el usuario te pide crear algo y tienes la herramienta, ¡úsala! 
El usuario que está hablando contigo tiene permiso de administrador, así que no dudes en realizar las modificaciones.
Si modificas algo, dile al usuario que la operación fue un éxito.`;

      const currentMessages = [...messages, newMsg];

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: currentMessages,
          systemInstruction,
          dbContext,
          isAdmin: !!user
        })
      });

      const data = await res.json();
      
      let botText = data.text || '';

      if (data.functionCalls && data.functionCalls.length > 0) {
        for (const call of data.functionCalls) {
          const { name, args } = call;
          if (name === 'addChallenge') {
            const newId = `R${Math.floor(Math.random() * 10000)}`;
            await saveEntity('challenges', {
              id: newId,
              title: args.title,
              description: args.description,
              priority: args.priority || 'medium',
              scope: args.scope || 'global',
              territory_ids: [],
              objective_ids: []
            });
            triggerUpdate();
            botText += `\n\n[He añadido el reto: "${args.title}"]`;
          } else if (name === 'addSolution') {
            const newId = `S${Math.floor(Math.random() * 10000)}`;
            await saveEntity('solutions', {
              id: newId,
              title: args.title,
              description: args.description,
              type: args.type || 'general', challenge_ids: [], cause_ids: []
            });
            triggerUpdate();
            botText += `\n\n[He añadido la solución: "${args.title}"]`;
          } else if (name === 'modifyTerritory') {
            const t = territories.find(t => t.name.toLowerCase() === args.territoryName.toLowerCase());
            if (t) {
              await saveEntity('territories', { ...t, description: args.newDescription });
              triggerUpdate();
              botText += `\n\n[He modificado la descripción del territorio: "${t.name}"]`;
            } else {
              botText += `\n\n[No encontré un territorio con el nombre: "${args.territoryName}"]`;
            }
          } else if (name === 'assignChallengeToObjective') {
            const c = challenges.find(ch => ch.id === args.challengeId);
            const o = objectives.find(obj => obj.id === args.objectiveId);
            if (c && o) {
              if (!c.objective_ids?.includes(o.id) && !c.objectives?.includes(o.id)) {
                await saveEntity('challenges', { ...c, objective_ids: [...(c.objective_ids || c.objectives || []), o.id] });
                triggerUpdate();
                botText += `\n\n[He asignado el reto "${c.title}" al objetivo "${o.title}"]`;
              } else {
                botText += `\n\n[El reto "${c.title}" ya estaba asignado al objetivo "${o.title}"]`;
              }
            } else {
              botText += `\n\n[No encontré el reto o el objetivo especificado para la asignación]`;
            }
          } else if (name === 'assignChallengeToTerritory') {
            const c = challenges.find(ch => ch.id === args.challengeId);
            const t = territories.find(ter => ter.id === args.territoryId);
            if (c && t) {
              if (!c.territory_ids.includes(t.id)) {
                await saveEntity('challenges', { ...c, territory_ids: [...(c.territory_ids || []), t.id] });
                triggerUpdate();
                botText += `\n\n[He asignado el reto "${c.title}" al territorio "${t.name}"]`;
              } else {
                botText += `\n\n[El reto "${c.title}" ya estaba asignado al territorio "${t.name}"]`;
              }
            } else {
              botText += `\n\n[No encontré el reto o el territorio especificado para la asignación]`;
            }
          }
        }
      }

      if (!botText) botText = "Hecho.";

      setMessages(prev => [...prev, { role: 'model', text: botText }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'model', text: "Hubo un error al comunicarme con el servidor." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button 
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 w-14 h-14 bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-xl hover:bg-emerald-700 transition-all z-50",
          isOpen && "hidden"
        )}
      >
        <MessageSquare className="w-6 h-6" />
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-80 sm:w-96 h-[32rem] bg-white rounded-2xl shadow-2xl flex flex-col z-50 border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between p-4 bg-emerald-600 text-white">
            <h3 className="font-bold">Asistente IA</h3>
            <button onClick={() => setIsOpen(false)} className="hover:bg-emerald-700 p-1 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto bg-slate-50 flex flex-col gap-3 text-sm">
            {messages.length === 0 && (
              <div className="text-center text-slate-500 mt-4">
                ¡Hola! Soy el asistente de Red Humana. ¿En qué te puedo ayudar hoy?
              </div>
            )}
            {messages.map((msg, idx) => (
              <div key={idx} className={cn("max-w-[85%] rounded-xl p-3", msg.role === 'user' ? "bg-emerald-100 text-emerald-900 self-end" : "bg-white border border-slate-200 text-slate-700 self-start")}>
                {msg.text}
              </div>
            ))}
            {loading && (
              <div className="bg-white border border-slate-200 text-slate-700 self-start rounded-xl p-3 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Pensando...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 border-t border-slate-200 bg-white">
            <div className="flex gap-2">
              <input 
                type="text" 
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="Escribe un mensaje..."
                className="flex-1 bg-slate-100 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              />
              <button 
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="w-10 h-10 bg-emerald-600 text-white rounded-full flex items-center justify-center disabled:opacity-50"
              >
                <Send className="w-4 h-4 -ml-0.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
