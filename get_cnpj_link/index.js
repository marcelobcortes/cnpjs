var con = require("../con");
const cheerio = require('cheerio')
const puppeteer = require('puppeteer');


void async function(){

    async function asyncForEach(array, callback) {
        for (let index = 0; index < array.length; index++) {
          await callback(array[index], index, array)
        }
    }

    async function getQuerys(){
        q = "select nome from cidades where done = 0";
        cidades = await con.query(q);
    
        q = "select cnae from cnaes where ativo = 1";
        cnaes = await con.query(q);
    
        queryList = [];
    
        function getQuery(cidade, cnae){
            return "http://www.google.com/search?q=site:empresascnpj.com \"" + cidade + "\" \"" + cnae + "\"";
        }
        cidades.forEach((cidade) => {
            cnaes.forEach((cnae)=>{
                queryList.push(getQuery(cidade.nome, cnae.cnae));
            });
        });
    
        return queryList;
    }

    var scrape = async (url) => {
        const browser = await puppeteer.launch({headless: true});
        const page = await browser.newPage();
        await page.goto(url);
        await page.waitFor(500);
        html = page.content();
    
        await page.waitFor(500);
      
        browser.close();
        return html;
      
    };
    
    var getPageLinks = async (url) => {
    
        linkList = [];
        
        html = await scrape(url);
        $ = cheerio.load(html);
        original_url_nodes = $('div.rc');
        cache_url_nodes = $('a.fl');
    
        index = 0;
        do {
            i = 0
            for (; i<10; i++){
                if (original_url_nodes[i] && original_url_nodes[i].children[0] && original_url_nodes[i].children[0].children[0] && original_url_nodes[i].children[0].children[0].attribs.href){
                    original_link = original_url_nodes[i].children[0].children[0].attribs.href;
                    cache_link = "";
                    if (cache_url_nodes[i] && cache_url_nodes[i].attribs.href){
                        cache_link = cache_url_nodes[i].attribs.href;
                        cache_link = cache_link.substring(0, cache_link.length - 44);
                    }
                    linkList.push({original_link, cache_link});
                } else {
                    break;
                }
            }
            if (i==10){
                html = await scrape(url + "&start=" + ++index*10);
                $ = cheerio.load(html);
                original_url_nodes = $('div.rc');
                cache_url_nodes = $('a.fl');
            }
            console.log("pagina: " + index);
        } while (i==10);
    
        return linkList;
    };

    var insertLinksToDB = async (links, query)=>{
        insertQuery = "insert ignore into empresas (link, cache, query) values ";
        links.forEach((link)=>{
            insertQuery = insertQuery + "('" + link.original_link + "', '" + link.cache_link + "', '" + query + "'),";
        });
        insertQuery = insertQuery.substring(0, insertQuery.length - 1);

        await con.query(insertQuery);
    };

    var setCidadeDone = async ()=>{
        updateQuery = "update cidades set done = 1";
        await con.query(updateQuery);
    };

    try {
        await con.connect();

        // URLs de busca de cada query
        queryList = await getQuerys();

        index = 0;
        await asyncForEach(queryList, async (query)=>{
            console.log("query " + query);
            // extract links from pages
            links = await getPageLinks(query);
            
            await insertLinksToDB(links, query);

            await setCidadeDone();
        });

    } catch (e) {
        console.log(e);
    }
    con.end();
}();