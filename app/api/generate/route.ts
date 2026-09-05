import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(request: Request) {
  try {

    const body = await request.json();

    const system = body.system;
    const environment = body.environment;
    const issueDescription = body.issueDescription;

    console.log("Issue received:", issueDescription);

    console.log(
      "GROQ_API_KEY exists:",
      !!process.env.GROQ_API_KEY
    );

    const client = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
    });

    const completion = await client.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages: [
        {
          role: "system",
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
- Do not use Markdown formatting.
- Do not use asterisks (*) for emphasis.
- Do not use bold formatting such as **text**.
- Return plain text only.
          `,  
        },
        {
          role: "user",
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
      completion.choices[0].message.content ??
      "No report generated.";

    return NextResponse.json({
      report,
    });

  } catch (error) {
    console.error("Groq Error:", error);

    return NextResponse.json(
      {
        error: "Failed to generate report.",
      },
      {
        status: 500,
      }
    );
  }
}