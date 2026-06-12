import { BEHAVIORAL_QUESTIONS, LIMITS } from '@ltb/shared';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Chips, Field, StepScreen } from '@/components/form';
import { useOnboarding } from '@/features/onboarding/store';
import { LTB } from '@/constants/theme';

export default function QuestionsStep() {
  const { answers, set } = useOnboarding();
  const chosen = answers.map((a) => a.question);

  const toggle = (q: string) => {
    if (chosen.includes(q)) {
      set({ answers: answers.filter((a) => a.question !== q) });
    } else if (answers.length < LIMITS.maxBehavioralAnswers) {
      set({ answers: [...answers, { question: q, answer: '' }] });
    }
  };

  const setAnswer = (q: string, text: string) =>
    set({ answers: answers.map((a) => (a.question === q ? { ...a, answer: text } : a)) });

  const complete =
    answers.length === LIMITS.maxBehavioralAnswers &&
    answers.every((a) => a.answer.trim().length > 0);

  return (
    <StepScreen
      title="Behavioral Questions"
      subtitle={`Pick ${LIMITS.maxBehavioralAnswers} and answer with a straight face.`}
      ctaLabel="Continue"
      ctaDisabled={!complete}
      onNext={() => router.push('/(onboarding)/photos')}>
      <Chips
        label={`Questions (${answers.length}/${LIMITS.maxBehavioralAnswers})`}
        options={BEHAVIORAL_QUESTIONS}
        selected={chosen}
        onToggle={toggle}
      />
      {answers.map((a) => (
        <View key={a.question} style={styles.answerBlock}>
          <Text style={styles.q}>{a.question}</Text>
          <Field
            label="Your answer"
            value={a.answer}
            onChangeText={(t) => setAnswer(a.question, t)}
            multiline
            maxLength={300}
          />
        </View>
      ))}
    </StepScreen>
  );
}

const styles = StyleSheet.create({
  answerBlock: {
    backgroundColor: LTB.paper,
    borderRadius: 6,
    padding: 12,
    marginTop: 10,
  },
  q: { color: LTB.navy, fontWeight: '600', marginBottom: 8 },
});
