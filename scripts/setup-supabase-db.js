require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Use the provided service key
const supabaseUrl = 'https://bxmadsmygulxbjbreclm.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4bWFkc215Z3VseGJqYnJlY2xtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDYwOTE0MCwiZXhwIjoyMDU2MTg1MTQwfQ.hkai7KjNohmGEHzUQI6TZETv5caygDtPY9cL2Bh8dyo';

// Create Supabase client with service role key for admin privileges
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupDatabase() {
  try {
    console.log('Starting Supabase database setup...');
    
    // Read the SQL setup file
    const sqlPath = path.join(__dirname, '../supabase-setup.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('SQL file loaded successfully');
    
    // Split the SQL into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    console.log(`Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement separately
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      
      try {
        const { error } = await supabase.rpc('exec_sql', { query: stmt });
        
        if (error) {
          console.error(`Error executing statement ${i + 1}:`, error);
          console.log('Statement:', stmt);
        } else {
          console.log(`Statement ${i + 1} executed successfully`);
        }
      } catch (stmtError) {
        console.error(`Exception executing statement ${i + 1}:`, stmtError);
        console.log('Statement:', stmt);
      }
    }
    
    // Verify tables were created
    console.log('Checking if tables were created...');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['twins', 'messages']);
    
    if (tablesError) {
      console.error('Error checking tables:', tablesError);
    } else {
      console.log('Tables found:', tables.map(t => t.table_name).join(', '));
      
      if (tables.length === 2) {
        console.log('✅ Database setup completed successfully!');
      } else {
        console.log('⚠️ Some tables may not have been created properly.');
      }
    }
    
  } catch (error) {
    console.error('Error setting up database:', error);
  }
}

setupDatabase(); 