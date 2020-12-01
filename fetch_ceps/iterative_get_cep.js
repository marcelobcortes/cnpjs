const rp = require('request-promise');
const cheerio = require('cheerio');
var con = require('../con');

options = {
    uri: `https://www.guiadecompra.com/cep/cidade/sao-jose-do-rio-preto-SP`,
    transform: function (body) {
      return cheerio.load(body);
    }
};

pagesList = [];
cepList = [];

    /*
        entra na pagina principal e descobre o nome da cidade
        verifica se a cidade já está adicionada

        vai de um em um até a página final e
        adiciona todas as páginas na array `pagesList`

        percorre a array extraindo os CEPs do <a>.text()
        
        adiciona os CEPs daquela cidade no banco
    */
void async function(){

    try {
        await con.connect();
        
        end = false;
        i = 0;
        // pega o conteudo de todas as páginas
        while (!end){
            try {
                $ = await rp(options);
                links = [];
    
                if (!options.cidade){
                    nome = $('h1').text();
                    nome = nome.substring(7, nome.length - 5);
                    options.cidade = nome;

                    query = "select id from cidades where nome = '" + options.cidade + "'";
                    r = await con.query(query);
            
                    cidadeId = 0;
            
                    // pega o ID da cidade em questão
                    if (!r[0]){
                        insert = "insert into cidades (nome) values ('" + options.cidade + "')";        
                        re = await con.query(insert);
            
                        cidadeId = re.insertId;
                    } else {
                        console.log("Cidade já cadastrada");
                        con.end();
                        return false;
                    }
                }
                console.log("Pagina: " + ++i);
    
                $('a').each(function(i, elem){
                    currLink = {url: $(this).attr('href'), text: $(this).text()};
    
                    if (currLink.text == "Próxima"){
                        tmp = options.uri;
                        options.uri = currLink.url;
    
                        if (tmp == options.uri){
                            end = true;
                        }
                    }
                    links.push(currLink);
                });
    
                pagesList.push(links);
            } catch (e) {
                console.log(e);
            }
        }
    
        pagesList.forEach(function(page){
            page.forEach(function(e){
                url = e.url;
                text = e.text;
                if (url && url.substring(0, 5) == "/ceps"){
                    cepList.push(text.substring(0, 9));
                }
            });
        });

        insertCeps = "insert into ceps (cidadeId, cep) values ";

        // insere todos os CEPs da cidade
        cepList.forEach(function(a){
            insertCeps = insertCeps + "(" + cidadeId + ", '" + a + "'),";
        });
        insertCeps = insertCeps.substring(0, insertCeps.length - 1);

        await con.query(insertCeps);

    } catch (e){
        console.log(e);
    }

    con.end();
}();