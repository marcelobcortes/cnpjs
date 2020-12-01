var con = require('../con');

void async function(){

    try {

        await con.connect();

        // colocar os cnaes e ceps em arrays
        cnae_list = [];
        cnae_query = "select cnae from cnaes";
        cnae_r = await con.query(cnae_query);
        i = 0;
        while (cnae_r[i]){
            cnae_list.push(cnae_r[i++].cnae)
        }
        cep_list = [];
        cep_query = "select cep from ceps";
        cep_r = await con.query(cep_query);
        i = 0;
        while (cep_r[i]){
            cep_list.push(cep_r[i++].cep);
        }

        // combinar ambos em uma string
        function getStr(cnae, cep){
            return "site:empresascnpj.com \"CNAE " + cnae + "\" \"CEP " + cep + "\"";
        }
        
        query_list = [];
        cep_list.forEach(cep => {            
            cnae_list.forEach(cnae => {
                query_list.push(getStr(cnae, cep));
            });
        });

        // jogar a query string no banco
        baseInsertQuery = "insert into querys (query) values ('";
        insertQuery = baseInsertQuery;
        

        // divide em querys de 5000 itens
        i = 0;
        n = 0;
        total = query_list.length;
        totalQ = Math.ceil(total/5000);

        query_list.forEach(async function (e){
            insertQuery = insertQuery + e + "'), ('";

            if (i++%5000 == 0 && i != 1 || i == total){
                query = insertQuery.substring(0, insertQuery.length - 4);
                insertQuery = baseInsertQuery;
                
                console.log(++n + " / " + totalQ, i);
                
                try {
                    r = await con.query(query);
                } catch(err){
                    console.log(err);
                }
            }
        });
        console.log("Total querys: " + total);


        con.end();
    } catch(e){
        console.log(e);
    }

}();