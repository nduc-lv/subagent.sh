/**
 * Script to categorize existing agents that don't have categories
 */
import { db } from '@/lib/supabase/database';
import { autoCategorizAgent, getCategorizationConfidence } from '@/lib/utils/auto-categorizer';

async function categorizeExistingAgents() {
  try {
    console.log('🔍 Finding uncategorized agents...');
    
    // Get all agents without categories
    const uncategorizedAgents = await db.getAgents({ 
      filters: { category: null },
      limit: 1000 
    });

    if (!uncategorizedAgents || uncategorizedAgents.length === 0) {
      console.log('✅ No uncategorized agents found!');
      return;
    }

    console.log(`📊 Found ${uncategorizedAgents.length} uncategorized agents`);

    // Get all categories
    const categories = await db.getCategories();
    console.log(`📚 Found ${categories.length} categories`);

    const updates: Array<{ id: string; category_id: string; confidence: string; category_name: string }> = [];
    const skipped: Array<{ name: string; reason: string }> = [];

    // Process each agent
    for (const agent of uncategorizedAgents) {
      const categoryId = autoCategorizAgent(agent, categories);
      
      if (categoryId) {
        const category = categories.find(c => c.id === categoryId);
        const confidence = getCategorizationConfidence(agent, categories, categoryId);
        
        updates.push({
          id: agent.id,
          category_id: categoryId,
          confidence,
          category_name: category?.name || 'Unknown'
        });

        console.log(`✨ ${agent.name} → ${category?.name} (${confidence} confidence)`);
      } else {
        skipped.push({
          name: agent.name,
          reason: 'No suitable category found'
        });
        console.log(`⚠️  Skipped: ${agent.name} - no suitable category found`);
      }
    }

    // Apply updates
    if (updates.length > 0) {
      console.log(`\n🚀 Updating ${updates.length} agents...`);
      
      for (const update of updates) {
        try {
          await db.updateAgent(update.id, { category_id: update.category_id });
        } catch (error) {
          console.error(`❌ Failed to update ${update.id}:`, error);
        }
      }

      console.log('✅ Categorization complete!');
    }

    // Summary
    console.log('\n📈 Summary:');
    console.log(`✅ Categorized: ${updates.length}`);
    console.log(`⚠️  Skipped: ${skipped.length}`);
    
    if (updates.length > 0) {
      console.log('\n📊 Confidence breakdown:');
      const confidenceStats = updates.reduce((acc, update) => {
        acc[update.confidence] = (acc[update.confidence] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      Object.entries(confidenceStats).forEach(([confidence, count]) => {
        console.log(`  ${confidence}: ${count}`);
      });

      console.log('\n🏷️  Category breakdown:');
      const categoryStats = updates.reduce((acc, update) => {
        acc[update.category_name] = (acc[update.category_name] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      Object.entries(categoryStats).forEach(([category, count]) => {
        console.log(`  ${category}: ${count}`);
      });
    }

    if (skipped.length > 0) {
      console.log('\n⚠️  Skipped agents:');
      skipped.forEach(skip => {
        console.log(`  - ${skip.name}: ${skip.reason}`);
      });
    }

  } catch (error) {
    console.error('❌ Categorization failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  categorizeExistingAgents()
    .then(() => {
      console.log('🎉 Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

export { categorizeExistingAgents };