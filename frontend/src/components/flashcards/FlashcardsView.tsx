import React, { useState, useEffect } from 'react';
import {
  Layers,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  CheckCircle2,
  Bookmark,
  Shuffle,
  Award
} from 'lucide-react';
import { useDocuments } from '../../context/DocumentContext';
import { api } from '../../services/api';
import { Flashcard } from '../../types';

export const FlashcardsView: React.FC = () => {
  const { documents } = useDocuments();
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedDocId, setSelectedDocId] = useState<string>('');

  useEffect(() => {
    api.getFlashcards()
      .then(res => setCards(res))
      .catch(err => console.error(err));
  }, []);

  const handleGenerateCards = async () => {
    const docId = selectedDocId || documents[0]?.id;
    if (!docId) {
      alert('Please upload or select a study document.');
      return;
    }

    setLoading(true);
    try {
      const newCards = await api.generateFlashcards({
        document_ids: [docId],
        card_count: 8
      });
      setCards(newCards);
      setCurrentIndex(0);
      setIsFlipped(false);
    } catch (e: any) {
      alert(e.message || 'Error generating flashcards');
    } finally {
      setLoading(false);
    }
  };

  const handleRateCard = async (masteryLevel: number) => {
    if (!cards[currentIndex]) return;
    const currentCard = cards[currentIndex];
    try {
      const updated = await api.reviewFlashcard(currentCard.id, masteryLevel);
      setCards(prev => prev.map(c => c.id === updated.id ? updated : c));

      // Auto advance to next card
      if (currentIndex < cards.length - 1) {
        setIsFlipped(false);
        setCurrentIndex(i => i + 1);
      }
    } catch (e) {
      console.error('Failed to update mastery:', e);
    }
  };

  const currentCard = cards[currentIndex];
  const masteredCount = cards.filter(c => c.mastery_level === 2).length;
  const progressPct = cards.length > 0 ? Math.round((masteredCount / cards.length) * 100) : 0;

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-4xl mx-auto w-full text-left transition-colors">
      {/* Header */}
      <div className="pb-6 border-b-2 border-black dark:border-neutral-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-sans font-black tracking-tight text-black dark:text-white">
            Curriculum Memory & Retention Decks
          </h1>
          <p className="text-xs font-sans italic text-neutral-600 dark:text-neutral-400 mt-1">
            Spaced-repetition active recall cards grounded strictly in your curriculum literature.
          </p>
        </div>

        {cards.length > 0 && (
          <div className="flex items-center space-x-2 bg-white dark:bg-black px-3.5 py-1.5 border border-black dark:border-white text-xs font-mono">
            <Award className="w-4 h-4 text-black dark:text-white" />
            <span className="text-black dark:text-white font-bold uppercase tracking-wider">Mastery: {progressPct}%</span>
            <span className="text-neutral-500">({masteredCount}/{cards.length})</span>
          </div>
        )}
      </div>

      {/* Generator Toolbar */}
      <div className="p-5 border border-black dark:border-neutral-800 bg-white dark:bg-black flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3 flex-1 min-w-[240px]">
          <label className="text-[10px] font-mono font-bold text-neutral-500 uppercase tracking-widest flex-shrink-0">
            Source Text:
          </label>
          <select
            value={selectedDocId}
            onChange={(e) => setSelectedDocId(e.target.value)}
            className="w-full bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 px-3 py-2 text-xs font-sans text-black dark:text-white focus:outline-none focus:border-black dark:focus:border-white"
          >
            {documents.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleGenerateCards}
          disabled={loading || documents.length === 0}
          className="px-5 py-2.5 border border-black dark:border-white bg-black dark:bg-white text-white dark:text-black hover:bg-transparent hover:text-black dark:hover:bg-transparent dark:hover:text-white text-xs font-mono font-bold uppercase tracking-wider transition flex items-center space-x-1.5 disabled:opacity-40"
        >
          <Sparkles className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Generating Cards...' : 'Generate Deck'}</span>
        </button>
      </div>

      {/* 3D Interactive Flashcard Area */}
      {currentCard ? (
        <div className="space-y-6">
          {/* Card Counter */}
          <div className="flex items-center justify-between text-xs font-mono text-neutral-500 px-1 uppercase tracking-wider">
            <span>Deck: {currentCard.deck_name}</span>
            <span className="font-bold text-black dark:text-white">
              Card {currentIndex + 1} of {cards.length}
            </span>
          </div>

          {/* 3D Card Container */}
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="w-full h-80 sm:h-96 cursor-pointer perspective-1000 relative group select-none"
          >
            <div
              className={`w-full h-full duration-500 transform-style-3d relative transition-transform ${
                isFlipped ? 'rotate-y-180' : ''
              }`}
            >
              {/* FRONT SIDE */}
              <div className="absolute inset-0 w-full h-full bg-white dark:bg-black border-2 border-black dark:border-white p-8 flex flex-col justify-between backface-hidden transition">
                <div className="flex items-center justify-between text-xs font-mono text-neutral-500">
                  <span className="text-[9px] font-bold px-1.5 py-0.5 border border-black dark:border-white text-black dark:text-white uppercase tracking-wider">
                    {currentCard.topic}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider">Click to Flip</span>
                </div>

                <div className="my-auto text-center px-4">
                  <h2 className="text-xl sm:text-2xl font-sans font-bold text-black dark:text-white leading-snug">
                    {currentCard.front}
                  </h2>
                </div>

                <div className="text-center text-[10px] font-mono text-neutral-400 uppercase tracking-wider">
                  Select card to inspect verified answer
                </div>
              </div>

              {/* BACK SIDE */}
              <div className="absolute inset-0 w-full h-full bg-neutral-50 dark:bg-neutral-950 border-2 border-black dark:border-white p-8 flex flex-col justify-between backface-hidden rotate-y-180">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[9px] font-bold px-1.5 py-0.5 border border-black dark:border-white bg-black dark:bg-white text-white dark:text-black uppercase tracking-wider">
                    Grounded Answer
                  </span>
                  <span className="text-black dark:text-white font-bold flex items-center space-x-1">
                    <Bookmark className="w-3.5 h-3.5" />
                    <span>PAGE {currentCard.source_page}</span>
                  </span>
                </div>

                <div className="my-auto text-left px-2 sm:px-6 overflow-y-auto max-h-48">
                  <p className="text-sm sm:text-base text-black dark:text-white leading-relaxed font-sans">
                    {currentCard.back}
                  </p>
                </div>

                <div className="pt-3 border-t border-neutral-300 dark:border-neutral-800 text-center text-[10px] font-mono uppercase tracking-wider text-neutral-500">
                  Assess your recall precision:
                </div>
              </div>
            </div>
          </div>

          {/* Spaced Repetition Rating Action Bar */}
          <div className="p-4 border border-black dark:border-neutral-800 bg-white dark:bg-black flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  setIsFlipped(false);
                  setCurrentIndex(i => Math.max(0, i - 1));
                }}
                disabled={currentIndex === 0}
                className="p-2 border border-neutral-300 dark:border-neutral-700 text-black dark:text-white hover:border-black dark:hover:border-white disabled:opacity-30 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setIsFlipped(false);
                  setCurrentIndex(i => Math.min(cards.length - 1, i + 1));
                }}
                disabled={currentIndex >= cards.length - 1}
                className="p-2 border border-neutral-300 dark:border-neutral-700 text-black dark:text-white hover:border-black dark:hover:border-white disabled:opacity-30 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Rating Buttons */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleRateCard(0)}
                className="px-3.5 py-1.5 border border-black dark:border-neutral-700 hover:border-black dark:hover:border-white text-black dark:text-white text-xs font-mono uppercase tracking-wider transition hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black"
              >
                Again
              </button>
              <button
                onClick={() => handleRateCard(1)}
                className="px-3.5 py-1.5 border border-black dark:border-neutral-700 hover:border-black dark:hover:border-white text-black dark:text-white text-xs font-mono uppercase tracking-wider transition hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black"
              >
                Hard
              </button>
              <button
                onClick={() => handleRateCard(1)}
                className="px-3.5 py-1.5 border border-black dark:border-neutral-700 hover:border-black dark:hover:border-white text-black dark:text-white text-xs font-mono uppercase tracking-wider transition hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black"
              >
                Good
              </button>
              <button
                onClick={() => handleRateCard(2)}
                className="px-3.5 py-1.5 border border-black dark:border-white bg-black dark:bg-white text-white dark:text-black hover:bg-transparent hover:text-black dark:hover:bg-transparent dark:hover:text-white text-xs font-mono uppercase tracking-wider font-bold transition"
              >
                Mastered
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 border border-neutral-300 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-center space-y-3">
          <Layers className="w-10 h-10 mx-auto text-neutral-400 dark:text-neutral-600 mb-2" />
          <h3 className="text-base font-sans font-bold text-black dark:text-white">Deck Empty</h3>
          <p className="text-xs font-sans italic text-neutral-500">
            Generate flashcards from your academic repository to start active recall training.
          </p>
        </div>
      )}
    </div>
  );
};
