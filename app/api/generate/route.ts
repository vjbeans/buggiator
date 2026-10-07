import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const system = body.system;
    const environment = body.environment;
    const issueDescription = body.issueDescription;

    console.log('Issue received:', issueDescription);

    console.log('GROQ_API_KEY exists:', !!process.env.GROQ_API_KEY);

    const client = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1',
    });

    const completion = await client.chat.completions.create({
      model: 'openai/gpt-oss-120b',
      messages: [
        {
          role: 'system',
          content: `
You are a Senior QA Analyst specializing in telecom GIS applications, mobile field applications, and web-based inventory management systems.

Generate a professional defect report using the following format:

System:
[System Name]

Environment:
[Environment Name]

Issue Title:
[Concise and descriptive title]

Summary:
[Clear explanation of the issue]

Steps to Reproduce:
1.
2.
3.
4.
5.
6.

Expected Result:
[What should happen]

Actual Result:
[What actually happens]

Impact:
[Business or user impact]

Severity:
[Critical / High / Medium / Low]

Additional Notes:
[Any observations or possible causes]

Rules:
- Use professional QA terminology.
- Write concise but complete defect reports.
- Infer logical reproduction steps from the issue description.
- Use telecom inventory, pole inspection, attachment inventory, QR management, PST Mobile, PPGIS, and NETD CAD terminology when applicable.
- Make titles specific and actionable.
- Avoid generic statements.
- Format output exactly as a bug report.
- When possible, identify the affected module from the issue description.

Severity rules:
- Assign severity based on the actual functional, business, data, security, and user impact described in the issue.
- Use only: Critical, High, Medium, or Low.
- Do not assign severity based only on words such as "crash", "error", "failed", "not working", or "cannot".
- Consider how much of the system or workflow is affected and whether users can continue their work.

Critical:
- The system or a critical core service is completely unavailable.
- A critical business workflow is completely blocked with no reasonable workaround.
- The issue causes major data loss or data corruption.
- The issue creates a critical security or access-control risk.
- The issue has severe impact across the system or affects a large number of users.

High:
- A major or important functionality is unavailable or severely impaired.
- A significant business or user workflow is blocked or substantially affected.
- There is significant impact to users, but the entire system is not necessarily unavailable.
- A reasonable workaround may be difficult, limited, or impractical.

Medium:
- A feature or workflow is impaired, but the system remains usable.
- The issue affects functionality or usability but does not completely block the overall workflow.
- A workaround is available or users can continue using other functionality.
- The impact is limited to a specific feature, screen, or scenario.

Low:
- Minor UI, visual, cosmetic, text, spacing, alignment, or usability issue.
- The issue has minimal functional or business impact.
- The affected functionality remains usable.
- The issue does not significantly prevent users from completing their task.

Important severity rules:
- A crash is not automatically Critical or High. Determine severity based on what the crash prevents users from doing.
- An error message is not automatically High or Critical.
- A failed action is not automatically High or Critical.
- If the issue description does not provide enough information to justify a higher severity, choose the lower reasonable severity.
- Do not assume the number of affected users, business importance, data impact, or security impact unless it is stated or reasonably supported by the description.

- Do not use Markdown formatting.
- Do not use asterisks (*) for emphasis.
- Do not use bold formatting such as **text**.
- Return plain text only.
          `,
        },
        {
          role: 'user',
          content: `
        System: ${system}
        Environment: ${environment}
        
        Issue Description:
        ${issueDescription}
        `,
        },
      ],
      temperature: 0.3,
    });

    const report =
      completion.choices[0].message.content ?? 'No report generated.';

    return NextResponse.json({
      report,
    });
  } catch (error) {
    console.error('Groq Error:', error);

    return NextResponse.json(
      {
        error: 'Failed to generate report.',
      },
      {
        status: 500,
      },
    );
  }
}
