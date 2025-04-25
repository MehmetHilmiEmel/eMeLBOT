import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';

const ChatBot = () => {
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('chatMessages');
    return saved ? JSON.parse(saved) : [];
  });
  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [assistantMessage, setAssistantMessage] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Scroll aşağı kaydır
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, assistantMessage]);

  useEffect(() => {
    localStorage.setItem('chatMessages', JSON.stringify(messages));
  }, [messages]);

  const sendMessage = async (event) => {
    if ((event.key === 'Enter' || event.type === 'click') && userInput.trim() !== '') {
      setLoading(true);
      const newMessage = { role: 'user', content: userInput };
      const updatedMessages = [...messages, newMessage];

      setMessages(updatedMessages);
      setUserInput('');
      setAssistantMessage('');

      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'gemma3:4b',
            messages: [
              {
                role: 'system',
                content: 'You are an AI assistant.'
              },
              ...updatedMessages
            ],
            stream: true,
            options: {
              num_predict: 100
            }
          })
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let fullResponse = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter(line => line.trim() !== '');

          for (let line of lines) {
            try {
              const messageObj = JSON.parse(line);
              if (messageObj.message?.content) {
                fullResponse += messageObj.message.content;
                setAssistantMessage((prev) => prev + messageObj.message.content);
              }
            } catch (err) {
              console.warn("Chunk parse hatası:", chunk);
            }
          }
        }

        setMessages((prev) => [...prev, { role: 'assistant', content: fullResponse }]);
      } catch (error) {
        console.error('API hatası:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const resetChat = () => {
    setMessages([]);  // Mesajları sıfırla
    localStorage.removeItem('chatMessages');  // LocalStorage'ı sıfırla
  };

  const displayedMessages = [
    ...messages,
    loading && assistantMessage
      ? { role: 'assistant', content: assistantMessage }
      : null,
  ].filter(Boolean);

  return (
    <div className="chat-container" style={{ margin: 'auto', padding: 16 }}>

      <div className="messages" style={{ maxHeight: '70vh', overflowY: 'auto', marginBottom: 16 }}>
        {displayedMessages.map((msg, index) => (
          <div key={index} className={`message ${msg.role}`} style={{ marginBottom: 10 }}>
            <strong>{msg.role === 'user' ? 'Sen' : 'Asistan'}:</strong>
            <ReactMarkdown>{msg.content}</ReactMarkdown>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="input-container" style={{ display: 'flex', gap: 8 }}>
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          onKeyDown={sendMessage}
          placeholder="Bir şey yaz..."
          style={{ flex: 1, padding: 10 }}
        />
        <button onClick={sendMessage} disabled={loading}>
          {loading ? 'Gönderiliyor...' : 'Gönder'}
        </button>
        <button onClick={resetChat} style={{ backgroundColor: '#ff6f61'}}>
        Sohbeti Sıfırla
      </button>
      </div>

      {/* Sohbeti sıfırlama butonu */}

    </div>
  );
};

export default ChatBot;
