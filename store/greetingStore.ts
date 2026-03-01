import { create } from 'zustand';

const GREETINGS = [
  'Howdy',
  'Hello',
  'Hi',
  'Hola',
  'Bonjour',
  'Ciao',
  'Hallo',
  'Ola',
  'Aloha',
  'Namaste',
  'Salaam',
  'Marhaba',
  'Shalom',
  'Hej',
  'Hei',
  'Salut',
  'Merhaba',
  'Szia',
  'Ahoj',
  'Xin chao',
  'Sawasdee',
  'Mingalaba',
  'Sawubona',
  'Jambo',
  'Habari',
  'Dia dhuit',
  'Yassas',
  'Privet',
  'Zdravo',
  'Pozdrav',
  'Servus',
  'Dzień dobry',
  'Buna',
  'Labas',
  'Sveiki',
  'Tere',
  'Moien',
  'God dag',
  'Godan daginn',
  'Hyvää päivää',
  'Geia sou',
  'Selam',
  'As-salaam',
  'Kia ora',
  'Talofa',
  'Bula',
  'Konnichiwa',
  'Konbanwa',
  'Annyeonghaseyo',
  'Ni hao',
  'Nin hao',
  'Zdravstvuyte',
  'Dobry den',
  'Dobrý deň',
  'Dobar dan',
  'Bok',
  'Halo',
  'Kamusta',
  'Vanakkam',
  'Sat sri akaal',
  'Adaab',
  'Sannu',
  'Molo',
  'Avuxeni',
  'Ndewo',
  'Assalaamu alaikum',
  'Përshëndetje',
  'Mirëdita',
  'Tungjatjeta',
  'Pace'
] as const;

interface GreetingState {
  greetings: readonly string[];
  currentIndex: number;
  initialized: boolean;
  initializeGreeting: () => void;
  advanceGreeting: () => void;
}

export const useGreetingStore = create<GreetingState>((set, get) => ({
  greetings: GREETINGS,
  currentIndex: 0,
  initialized: false,
  initializeGreeting: () =>
    set((state) => {
      if (state.initialized) {
        return state;
      }

      const randomIndex = Math.floor(Math.random() * state.greetings.length);

      return {
        ...state,
        initialized: true,
        currentIndex: randomIndex,
      };
    }),
  advanceGreeting: () => {
    const { greetings, currentIndex } = get();
    set({ currentIndex: (currentIndex + 1) % greetings.length });
  },
}));
