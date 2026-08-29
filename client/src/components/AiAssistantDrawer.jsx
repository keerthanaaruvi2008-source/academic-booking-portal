/**
 * @fileoverview AI Assistant Chat Drawer Component.
 * Natural language assistant for resource discovery, scheduling suggestions, and 1-click booking.
 */

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { queryAiAssistant } from '../services/aiService.js';
import {
  Sparkles,
  X,
  Send,
  Loader2,
  Bot,
  User,
  Clock,
  Building,
  ArrowRight,
  Minimize2,
  Maximize2,
} from 'lucide-react';
import { EaswariEmblem } from './EaswariLogo.jsx';

/**
 * AI Assistant Chat Drawer.
 *
 * @param {object} props
 * @param {Function} [props.onPrefillBooking] - Callback invoked when user clicks a PREFILL_BOOKING action chip.
 * @returns {JSX.Element}
 */
export const AiAssistantDrawer = ({ onPrefillBooking }) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);

  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      text:
        `👋 **Welcome to Easwari Engineering College.**\n\n` +
        `I am your AI Academic Advisor. How can I assist you with facility reservations, open slot discovery, or booking guidelines across campus today?`,
      suggestedActions: [],
      suggestedResources: [],
      suggestedSlots: [],
    },
  ]);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
    }
  }, [messages, isOpen, isMinimized]);

  const handleSend = async (textToSend) => {
    const query = (textToSend || prompt).trim();
    if (!query || loading) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: query,
    };

    setMessages((prev) => [...prev, userMessage]);
    setPrompt('');
    setLoading(true);

    try {
      const res = await queryAiAssistant(query);
      const data = res.data;

      const assistantMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text: data.naturalLanguageResponse,
        suggestedActions: data.suggestedActions || [],
        suggestedResources: data.suggestedResources || [],
        suggestedSlots: data.suggestedSlots || [],
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          text: `⚠️ **Sorry, I couldn't process your request.**\n\n${err.message || 'Please check your connection and try again.'}`,
          suggestedActions: [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleActionClick = (actionObj) => {
    if (actionObj.action === 'PREFILL_BOOKING') {
      if (onPrefillBooking) {
        onPrefillBooking(actionObj.payload);
      }
    } else if (actionObj.action === 'NAVIGATE') {
      if (actionObj.payload?.path) {
        navigate(actionObj.payload.path);
      }
    } else if (actionObj.action === 'FILTER_RESOURCES') {
      navigate('/resources');
    }
  };

  const quickPrompts = [
    'Available slots for tomorrow',
    'Find a computer lab with 30 seats',
    'What are the booking rules?',
  ];

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-5 py-3.5 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 font-bold text-sm"
          aria-label="Open AI Assistant"
        >
          <Sparkles className="w-5 h-5" />
          <span>Ask AI Advisor</span>
        </button>
      )}

      {/* Floating Chat Drawer */}
      {isOpen && (
        <div
          className={`fixed bottom-6 right-6 z-50 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col transition-all duration-200 ${
            isMinimized ? 'w-80 h-14' : 'w-full sm:w-[420px] h-[580px] max-h-[85vh]'
          }`}
        >
          {/* Header */}
          <div className="bg-primary-600 text-white px-5 py-3.5 flex items-center justify-between flex-shrink-0">
            <div
              className="flex items-center gap-2.5 cursor-pointer flex-1"
              onClick={() => setIsMinimized(!isMinimized)}
            >
              <div className="p-1 bg-white/20 rounded-lg">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-sm leading-tight">AI Academic Advisor</h3>
                <p className="text-[11px] text-primary-100">Easwari Engineering College</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 hover:bg-white/20 rounded-lg transition"
                title={isMinimized ? 'Expand' : 'Minimize'}
              >
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-white/20 rounded-lg transition"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          {!isMinimized && (
            <>
              {/* Message List */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-50 text-xs">
                {messages.map((msg) => {
                  const isUser = msg.role === 'user';
                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isUser && (
                        <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Bot className="w-4 h-4" />
                        </div>
                      )}

                      <div
                        className={`max-w-[85%] rounded-2xl p-3.5 space-y-2.5 ${
                          isUser
                            ? 'bg-primary-600 text-white rounded-tr-none'
                            : 'bg-white text-gray-900 border border-gray-200 rounded-tl-none shadow-xs'
                        }`}
                      >
                        {/* Text */}
                        <div className="whitespace-pre-line leading-relaxed">{msg.text}</div>

                        {/* Matching Resources Mini-Cards */}
                        {msg.suggestedResources && msg.suggestedResources.length > 0 && (
                          <div className="pt-2 border-t border-gray-100 space-y-1.5">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                              Matched Facilities:
                            </span>
                            <div className="space-y-1">
                              {msg.suggestedResources.map((res) => (
                                <div
                                  key={res._id}
                                  className="p-2 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between text-gray-800"
                                >
                                  <div className="truncate">
                                    <div className="font-semibold truncate">{res.name}</div>
                                    <div className="text-[10px] text-gray-500">
                                      Cap: {res.capacity} • {res.location?.building || res.type}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 1-Click Action Chips */}
                        {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                          <div className="pt-2 border-t border-gray-100 flex flex-wrap gap-1.5">
                            {msg.suggestedActions.map((act, idx) => (
                              <button
                                key={idx}
                                onClick={() => handleActionClick(act)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 hover:bg-primary-100 text-primary-800 border border-primary-200 rounded-lg text-[11px] font-bold transition text-left active:scale-95 shadow-2xs"
                              >
                                {act.action === 'PREFILL_BOOKING' ? (
                                  <Clock className="w-3.5 h-3.5 text-primary-600 flex-shrink-0" />
                                ) : (
                                  <ArrowRight className="w-3.5 h-3.5 text-primary-600 flex-shrink-0" />
                                )}
                                <span>{act.label}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {isUser && (
                        <div className="w-7 h-7 rounded-full bg-gray-300 text-gray-700 flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold">
                          <User className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Loading Indicator */}
                {loading && (
                  <div className="flex gap-2.5 items-center text-gray-500">
                    <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="bg-white border border-gray-200 rounded-2xl px-3.5 py-2 flex items-center gap-2 text-xs shadow-xs">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-primary-600" />
                      <span>Verifying open slots...</span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Quick Suggestion Prompts */}
              {messages.length === 1 && (
                <div className="px-4 py-2 bg-gray-100/70 border-t border-gray-200 flex flex-wrap gap-1.5">
                  {quickPrompts.map((qp, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(qp)}
                      className="px-2.5 py-1 bg-white hover:bg-gray-50 border border-gray-200 rounded-full text-[11px] text-gray-600 transition shadow-2xs hover:border-primary-300 hover:text-primary-600"
                    >
                      {qp}
                    </button>
                  ))}
                </div>
              )}

              {/* Input Bar */}
              <div className="p-3 bg-white border-t border-gray-200 flex items-center gap-2">
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Ask for rooms, times, policies..."
                  disabled={loading}
                  className="flex-1 px-3.5 py-2 text-xs bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition"
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!prompt.trim() || loading}
                  className="p-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition disabled:opacity-40 shadow-xs flex-shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};

export default AiAssistantDrawer;
