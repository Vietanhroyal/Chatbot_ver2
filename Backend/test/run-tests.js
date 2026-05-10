const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:3000/api/v1/ai/chat';
const SCENARIOS_PATH = path.join(__dirname, 'scenarios', 'business-flow-test-scenarios.json');

async function runTest() {
  const scenariosData = JSON.parse(fs.readFileSync(SCENARIOS_PATH, 'utf8'));
  const scenarios = scenariosData.scenarios;

  let mdContent = '# Kết quả Test Kịch bản Nghiệp vụ\n\n';
  mdContent += `*Ngày chạy: ${new Date().toLocaleString()}*\n\n`;

  console.log('--- STARTING BUSINESS FLOW TESTS ---');

  for (const scenario of scenarios) {
    if (scenario.id === 'TC-14' || scenario.id === 'TC-15') continue; 

    console.log(`\n[${scenario.id}] ${scenario.name}`);
    mdContent += `## [${scenario.id}] ${scenario.name}\n\n`;
    let context = {};

    for (const turn of scenario.turns) {
      if (turn.skip) continue;
      
      console.log(`  Turn ${turn.turn}: "${turn.request.message}"`);
      mdContent += `### Turn ${turn.turn}\n`;
      mdContent += `**User:** "${turn.request.message}"\n\n`;
      
      try {
        const response = await axios.post(API_URL, turn.request);
        const data = response.data;
        
        console.log(`    - Intent: ${data.intent.name} (${data.intent.confidence})`);
        console.log(`    - Skill: ${data.skill.name}`);
        console.log(`    - Need More Info: ${data.reasoning.need_more_info}`);
        console.log(`    - Messages: ${data.messages.map(m => m.content).join(' | ')}`);
        
        mdContent += `**Bot Analysis:**\n`;
        mdContent += `- **Intent**: \`${data.intent.name}\` (Confidence: ${data.intent.confidence})\n`;
        mdContent += `- **Skill**: \`${data.skill.name}\`\n`;
        mdContent += `- **Need More Info**: \`${data.reasoning.need_more_info}\`\n`;
        
        if (data.pending_clarification) {
          console.log(`    - Pending Clarification: ${data.pending_clarification.type}`);
          mdContent += `- **Pending Clarification**: \`${data.pending_clarification.type}\`\n`;
          turn.request.context = {
            pending_clarification: data.pending_clarification,
            conversation_history: turn.request.context?.conversation_history || []
          };
          turn.request.context.conversation_history.push({ role: 'user', content: turn.request.message });
          turn.request.context.conversation_history.push({ role: 'assistant', content: data.messages[0].content });
        }
        
        mdContent += `\n**Bot Responses:**\n`;
        data.messages.forEach(m => {
          mdContent += `> ${m.content}\n`;
        });
        mdContent += '\n---\n\n';

      } catch (error) {
        console.log("    ================ CHI TIẾT LỖI ================");
        mdContent += `**❌ ERROR:**\n\`\`\`json\n`;
        
        if (error.response) {
            console.log(`    - HTTP Status: ${error.response.status}`);
            console.log(`    - Server Response:`, JSON.stringify(error.response.data, null, 2));
            mdContent += JSON.stringify(error.response.data, null, 2) + '\n';
        } else if (error.request) {
            console.log(`    - Không kết nối được tới server. Server đã bật chưa? (Lỗi: ${error.code})`);
            mdContent += `Connection Error: ${error.code}\n`;
        } else {
            console.log(`    - Lỗi khác: ${error.message}`);
            mdContent += `${error.message}\n`;
        }
        console.log("    ==============================================");
        mdContent += `\`\`\`\n\n---\n\n`;
      }
    }
  }
  
  const outputPath = path.join(__dirname, 'test-results.md');
  fs.writeFileSync(outputPath, mdContent, 'utf8');
  console.log(`\n--- TESTS COMPLETED. Results saved to ${outputPath} ---`);
}

runTest();
