window.addEventListener("load", function(){
  setTimeout(function(){
    try{
      document.getElementById("loginGate").style.display = "none";
      document.getElementById("resultadoAnalise").style.display = "block";
      window.SESSION = null; // sem nuvem; aprendizados/feedback não postam, mas a UI renderiza
      AN.arquivo = "denuncia_furto.pdf"; AN.paginas = 4;
      AN.texto = new Array(60).join("texto do processo de furto com reconhecimento fotografico irregular ");
      AN.cat = KB.find(function(c){ return c.id === "crim-furto"; });
      AN.conf = "alta";
      AN.dados = { parte:"João da Silva Fictício", processos:["0001234-56.2026.8.26.0100"],
        juizo:"3ª Vara Criminal da Comarca de Guarujá/SP", vara:"", comarca:"Guarujá",
        leis:["art. 155 do CP"], flags:{} };
      AN.analiseIA = {
        tipo_peca: AN.cat.peca, _cat:"crim-furto", aprendizados_aplicados:2, impugnacao_fatos:[],
        sintese:"No dia 15 de janeiro de 2026, o denunciado foi preso em flagrante sob acusação de furto qualificado. O reconhecimento foi feito por foto única, em desacordo com o art. 226 do CPP, e a coisa subtraída era de pequeno valor (R$ 34,50).",
        preliminares:[
          { titulo:"Nulidade do reconhecimento fotográfico", lei_seca:"art. 226 do CPP", gravidade:"alta",
            trecho_base:"reconhecimento realizado por exibição de foto única",
            desenvolvimento:"O reconhecimento não observou o procedimento do art. 226 do CPP, sendo imprestável como prova para a condenação.",
            jurisprudencia:"STF, HC 84.412/SP, Rel. Min. Celso de Mello", prioritario:true },
          { titulo:"Atipicidade material — princípio da insignificância", lei_seca:"art. 155 do CP", gravidade:"media",
            trecho_base:"coisa de pequeno valor (R$ 34,50)",
            desenvolvimento:"Presentes os vetores do HC 84.412/SP, a conduta é materialmente atípica, impondo-se a absolvição sumária.",
            jurisprudencia:null, prioritario:false }
        ],
        merito:[
          { titulo:"Furto privilegiado", lei_seca:"art. 155, §2º, do CP",
            desenvolvimento:"Réu primário e coisa de pequeno valor autorizam o privilégio, aplicável mesmo ao qualificado.",
            jurisprudencia:"Súmula 511 do STJ", prioritario:false }
        ],
        provas:["Oitiva das testemunhas de defesa","Juntada de documentos de antecedentes"],
        pedidos:["A absolvição sumária (art. 397, III, do CPP)","Subsidiariamente, o reconhecimento do furto privilegiado"],
        verificar_nos_autos:["Conferir a cadeia de custódia da res furtiva"], avisos:[],
        sumulas_rag:[
          { ref:"STJ, Súmula 511", sim:0.72, tese:"Cabe furto privilegiado-qualificado: primariedade + pequeno valor + qualificadora objetiva." },
          { ref:"STF, Súmula Vinculante 11", sim:0.58, tese:"Só é lícito o uso de algemas em casos de resistência e fundado receio de fuga." }
        ]
      };
      preencherCatSelect(); renderAnalise(); renderIA();
      var adv = document.getElementById("anAdv"); if(adv) adv.value = "Dr. Pedro Henrik — OAB/SP 522.939";
      var dt = document.getElementById("anIntimacao"); if(dt){ dt.value = "2026-07-06"; }
      atualizarPrazo();
      document.title = "DRIVE_OK";
    }catch(e){ document.title = "DRIVE_ERRO: " + e.message; }
  }, 1000);
});
