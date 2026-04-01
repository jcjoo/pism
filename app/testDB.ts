import { supabase } from "./src/services/supabase";

async function testDB() {
    const { data, error } = await supabase.from('clients').select('*');
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Data:', data);
    }
}

testDB();