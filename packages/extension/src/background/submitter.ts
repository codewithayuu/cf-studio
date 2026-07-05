import type { SubmitCodePayload, SubmitCodeData, PollSubmissionPayload, PollSubmissionData } from '@cf-studio/shared';

export async function submitCode(payload: SubmitCodePayload): Promise<SubmitCodeData> {
  const body = new URLSearchParams();
  body.append('csrf_token', payload.csrfToken);
  body.append('action', 'submit');
  body.append('submittedProblemCode', payload.submittedProblemCode);
  body.append('programTypeId', payload.programTypeId.toString());
  body.append('source', payload.source);
  body.append('tabsize', '4');

  try {
    const response = await fetch(`https://codeforces.com${payload.actionUrl}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
      redirect: 'follow',
      credentials: 'include'
    });

    if (response.redirected && (response.url.includes('/status') || response.url.includes('/my'))) {
      return { success: true };
    }
    
    return { success: false, error: 'Submission rejected. Check if you are logged in or if the language is valid.' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error during submit' };
  }
}

export async function pollSubmission(payload: PollSubmissionPayload): Promise<PollSubmissionData> {
  const url = `https://codeforces.com/api/user.status?handle=${payload.handle}&from=1&count=1`;
  
  try {
    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== 'OK') return null;
    const sub = data.result[0];
    if (!sub) return null;

    if (payload.contestId === 0) {
      return { id: sub.id, verdict: null, passedTestCount: null, timeConsumed: null, memoryConsumed: null };
    }

    if (sub.id <= payload.minSubmissionId) return null;

    if (sub.problem.contestId === payload.contestId && sub.problem.index === payload.index) {
      return {
        id: sub.id,
        verdict: sub.verdict || null,
        passedTestCount: sub.passedTestCount ?? null,
        timeConsumed: sub.timeConsumedMilliseconds ?? null,
        memoryConsumed: sub.memoryConsumedBytes ?? null,
      };
    }
    return null;
  } catch (err) {
    console.error('[CF Studio] CF API poll failed', err);
    return null;
  }
}
