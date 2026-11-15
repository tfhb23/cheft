/**
 * Ersatznamen für Spieler, die ihren Namen nicht eingeben: vergessliche, zerstreute oder gedächtnislose
 * Figuren aus Film und Literatur. Höchstens 12 Zeichen, so lang darf ein Name sein.
 */
export const FORGOTTEN_NAMES: string[] = [
  'Dory', // Findet Nemo
  'Neville', // Neville Longbottom, Harry Potter (Erinnerungskugel)
  'Lockhart', // Gilderoy Lockhart, Harry Potter (Gedächtniszauber missglückt)
  'Bienlein', // Professor Bienlein (Tim und Struppi: Tournesol)
  'Van Winkle', // Rip Van Winkle, schläft zwanzig Jahre und weiß von nichts
  'Lotosesser', // Odyssee: wer davon isst, vergisst die Heimat
  'Proust', // Auf der Suche nach der verlorenen Zeit
  'Dr Jekyll', // erinnert sich nicht an Mr Hyde
  'Quaid', // Douglas Quaid, Total Recall
  'Bourne', // Jason Bourne, Die Bourne Identität
  'Clementine', // Vergiss mein nicht!
  'Pilgrim', // Billy Pilgrim, Schlachthof 5
  'Josef K.', // Der Prozess: weiß nicht, wessen er angeklagt ist
  'Kapitän Nemo', // lateinisch: Niemand
  'I-Ah', // verliert ständig seinen Schwanz
  'Colombo', // „Ach, noch eine Frage …“
  'Mr. Burns', // erkennt Homer nie wieder
  'Agent K', // Men in Black: Neuralisator
  'Sam Beckett', // Zurück in die Vergangenheit: Zeitspringer ohne Erinnerung
  'Bilbo', // verlässt das Haus ohne Taschentuch
  'Alice', // vergisst im Wald ohne Namen ihren Namen
  'Dornröschen', // hundert Jahre Schlaf
  'Hans Castorp', // Der Zauberberg: aus drei Wochen werden sieben Jahre
];

export function randomForgottenName(rng: () => number = Math.random): string {
  return FORGOTTEN_NAMES[Math.floor(rng() * FORGOTTEN_NAMES.length)];
}
