#!/usr/bin/env python3
import sys
import json
import argparse
from sentence_transformers import SentenceTransformer, util

# Optional: use spaCy to extract grammatical roles (subject, verb, object)
nlp = None
try:
    import spacy
    try:
        # prefer the small English model if available
        nlp = spacy.load('en_core_web_sm')
    except Exception:
        try:
            # attempt to download the model if missing (best-effort)
            from spacy.cli import download
            download('en_core_web_sm')
            nlp = spacy.load('en_core_web_sm')
        except Exception:
            nlp = None
except Exception:
    nlp = None

EXAMPLES = [
    {"sentence": "I'm feeling under the weather.", "explanation": "You mean you're feeling slightly ill or unwell.", "usage": ["I'm feeling under the weather today, so I'll skip the meeting."], "context": "health, informal"},
    {"sentence": "Could you pass the salt?", "explanation": "A polite request asking someone to hand you the salt.", "usage": ["Could you pass the salt, please?"], "context": "table manners, polite request"},
    {"sentence": "I'll get back to you on that.", "explanation": "You mean you'll reply later after checking or thinking about it.", "usage": ["I'll get back to you on that after I check my calendar."], "context": "workplace, follow-up"},
    {"sentence": "I'm sorry for the inconvenience.", "explanation": "An apology used to acknowledge a problem and express regret.", "usage": ["I'm sorry for the inconvenience caused by the delay."], "context": "apology, formal"},
    {"sentence": "Let's grab coffee sometime.", "explanation": "A casual invitation to meet for coffee at a later time.", "usage": ["Let's grab coffee sometime next week and catch up."], "context": "social invitation, informal"},
    {"sentence": "Do you mind if I open the window?", "explanation": "A polite question asking permission to open the window.", "usage": ["Do you mind if I open the window? It's a bit warm."], "context": "politeness, permission"},
    {"sentence": "That sounds like a plan.", "explanation": "You agree with the suggested plan and think it's good to proceed.", "usage": ["We leave at 7am? That sounds like a plan."], "context": "agreement, planning"},
    {"sentence": "I didn't catch your name.", "explanation": "You are saying you didn't hear or remember the other person's name and ask them again.", "usage": ["I'm sorry, I didn't catch your name. Could you repeat it?"], "context": "introductions, clarification"},
    {"sentence": "Can you give me a hand with this?", "explanation": "You're asking someone to help you with a task.", "usage": ["Can you give me a hand with moving this table?"], "context": "request for help, informal"},
    {"sentence": "I'm running a bit late.", "explanation": "You're informing someone you'll arrive later than planned.", "usage": ["I'm running a bit late, I'll be there in 10 minutes."], "context": "time, travel"},
    {"sentence": "Please let me know if you have any questions.", "explanation": "A polite offer to provide further assistance or clarification.", "usage": ["Please let me know if you have any questions about the report."], "context": "professional, help"},
    {"sentence": "I totally agree with you.", "explanation": "You're expressing complete agreement with someone's opinion.", "usage": ["I totally agree with you — that approach will save time."], "context": "agreement, support"},
]

parser = argparse.ArgumentParser()
parser.add_argument('--text', '-t', type=str, required=True)
args = parser.parse_args()
text = args.text.strip()

model = SentenceTransformer('all-MiniLM-L6-v2')

corpus = [e['sentence'] for e in EXAMPLES]
corpus_embeddings = model.encode(corpus, convert_to_tensor=True)
query_embedding = model.encode(text, convert_to_tensor=True)

# compute cosine similarities
cos_scores = util.cos_sim(query_embedding, corpus_embeddings)[0]
import torch
scores = cos_scores.cpu().numpy()
# get top k
k=3
topk_idx = list(reversed(sorted(range(len(scores)), key=lambda i: scores[i])))[:k]

results = []
for i in topk_idx:
    results.append({
        'sentence': EXAMPLES[i]['sentence'],
        'explanation': EXAMPLES[i]['explanation'],
        'usage': EXAMPLES[i].get('usage', []),
        'context': EXAMPLES[i].get('context',''),
        'score': float(scores[i])
    })

# create a combined response
combined_explanation = results[0]['explanation']
combined_usage = results[0].get('usage', [])
contexts = [r.get('context') for r in results if r.get('context')]

out = {
    'word': None,
    'meaning': combined_explanation,
    'definitions': [{'partOfSpeech': '', 'definition': combined_explanation}],
    'synonyms': [],
    'antonyms': [],
    'examples': combined_usage,
    'pronunciation': { 'ipa': None, 'audioUrl': None },
    'contexts': contexts,
    'matches': results,
    'original': text
}

# If spaCy loaded, parse grammatical roles and attach
if nlp:
    try:
        doc = nlp(text)
        subjects = []
        verbs = []
        objects = []
        for token in doc:
            if token.dep_ in ('nsubj', 'nsubjpass'):
                subj_phrase = ' '.join([t.text for t in token.subtree])
                subjects.append(subj_phrase)
            if token.pos_ == 'VERB' or token.dep_ == 'ROOT':
                verbs.append(token.lemma_)
            if token.dep_ in ('dobj', 'obj', 'pobj', 'iobj'):
                obj_phrase = ' '.join([t.text for t in token.subtree])
                objects.append(obj_phrase)

        # dedupe while preserving order
        def dedupe(seq):
            seen = set(); out = []
            for s in seq:
                if s not in seen:
                    seen.add(s); out.append(s)
            return out

        out['grammar'] = {
            'subjects': dedupe(subjects),
            'verbs': dedupe(verbs),
            'objects': dedupe(objects)
        }
    except Exception:
        # don't fail on parsing errors
        out['grammar'] = None

print(json.dumps(out, ensure_ascii=False))
