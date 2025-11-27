import('./backend/migrations/rename_tagalog_des_to_subtitle_recipes.js').then(m => m.default()).then(() => {
  console.log('✅ Recipes migration completed successfully');
  process.exit(0);
}).catch(err => {
  console.error('❌ Recipes migration failed:', err.message);
  process.exit(1);
});
