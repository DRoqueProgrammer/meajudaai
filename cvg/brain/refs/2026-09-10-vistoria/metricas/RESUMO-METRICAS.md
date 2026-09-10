# Métricas automáticas — Me Ajuda Aí (build de produção, localhost)

Gerado em 2026-09-10T15:28:16.727Z. Detalhes completos (exemplos de cada infração) em `manifest.json`.

Viewports: mobile 390×844 @2x · tablet 768×1024 · desktop 1440×900. "Telas" = quantas alturas de viewport a página ocupa (screenshots limitados a 5).

Contraste é aproximado (cor do texto vs. primeiro fundo sólido ancestral). Alvo de toque: WCAG 2.5.8 AA exige 24px; 44px é a recomendação para dedo.

| papel | página | vp | telas | estouro horiz. | toque <24 | toque <44 | fonte mín. | tam. distintos | contraste baixo | sem nome | campos s/ label | erros console | TTFB |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| anon | / (escuro) | mobile | 4 | **SIM** (392px) | 8 | 1 | 11px | 14 | 7 | 0 | 0 | 0 | 881ms |
| anon | / (escuro) | desktop | 2 | não | 8 | 2 | 11px | 14 | 7 | 0 | 0 | 0 | 985ms |
| anon | / | mobile | 4 | **SIM** (392px) | 8 | 1 | 11px | 14 | 7 | 0 | 0 | 0 | 212ms |
| anon | /login | mobile | 2 | não | 9 | 1 | 12.5px | 3 | 4 | 0 | 0 | 0 | 3ms |
| anon | /cadastro | mobile | 2 | não | 7 | 1 | 12px | 5 | 4 | 0 | 0 | 0 | 19ms |
| anon | /cadastro?papel=prestador_servico | mobile | 3 | não | 8 | 3 | 12px | 6 | 5 | 0 | 1 | 0 | 18ms |
| anon | /recuperar-senha | mobile | 2 | não | 7 | 1 | 12.5px | 4 | 4 | 0 | 0 | 0 | 9ms |
| anon | /termos | mobile | 3 | **SIM** (405px) | 9 | 2 | 12px | 6 | 4 | 0 | 0 | 0 | 3ms |
| anon | /privacidade | mobile | 3 | **SIM** (405px) | 9 | 2 | 12px | 6 | 4 | 0 | 0 | 0 | 4ms |
| anon | /pagina-que-nao-existe | mobile | 2 | não | 9 | 1 | 12.5px | 3 | 4 | 0 | 0 | 0 | 6ms |
| anon | / | tablet | 3 | não | 8 | 2 | 11px | 14 | 7 | 0 | 0 | 0 | 495ms |
| anon | /login | tablet | 2 | não | 9 | 1 | 12.5px | 3 | 4 | 0 | 0 | 0 | 5ms |
| anon | /cadastro | tablet | 2 | não | 7 | 1 | 12px | 5 | 4 | 0 | 0 | 0 | 8ms |
| anon | /cadastro?papel=prestador_servico | tablet | 2 | não | 8 | 3 | 12px | 6 | 5 | 0 | 1 | 0 | 14ms |
| anon | /recuperar-senha | tablet | 2 | não | 7 | 1 | 12.5px | 4 | 4 | 0 | 0 | 0 | 11ms |
| anon | /termos | tablet | 2 | não | 9 | 2 | 12px | 6 | 4 | 0 | 0 | 0 | 7ms |
| anon | /privacidade | tablet | 2 | não | 9 | 2 | 12px | 6 | 4 | 0 | 0 | 0 | 3ms |
| anon | /pagina-que-nao-existe | tablet | 2 | não | 9 | 1 | 12.5px | 3 | 4 | 0 | 0 | 0 | 4ms |
| anon | / | desktop | 2 | não | 8 | 2 | 11px | 14 | 7 | 0 | 0 | 0 | 503ms |
| anon | /login | desktop | 2 | não | 9 | 1 | 12.5px | 3 | 4 | 0 | 0 | 0 | 3ms |
| anon | /cadastro | desktop | 2 | não | 7 | 1 | 12px | 5 | 4 | 0 | 0 | 0 | 11ms |
| anon | /cadastro?papel=prestador_servico | desktop | 2 | não | 8 | 3 | 12px | 6 | 5 | 0 | 1 | 0 | 7ms |
| anon | /recuperar-senha | desktop | 2 | não | 7 | 1 | 12.5px | 4 | 4 | 0 | 0 | 0 | 8ms |
| anon | /termos | desktop | 2 | não | 9 | 2 | 12px | 6 | 4 | 0 | 0 | 0 | 4ms |
| anon | /privacidade | desktop | 2 | não | 9 | 2 | 12px | 6 | 4 | 0 | 0 | 0 | 4ms |
| anon | /pagina-que-nao-existe | desktop | 2 | não | 9 | 1 | 12.5px | 3 | 4 | 0 | 0 | 0 | 4ms |
| anon | / (escuro) | mobile | 4 | **SIM** (392px) | 8 | 1 | 11px | 14 | 6 | 0 | 0 | 0 | 248ms |
| anon | / (escuro) | desktop | 2 | não | 8 | 2 | 11px | 14 | 6 | 0 | 0 | 0 | 201ms |
| cliente | /inicio | mobile | 2 | não | 14 | 1 | 10px | 8 | 3 | 0 | 0 | 0 | 804ms |
| cliente | /buscar-prestador | mobile | 2 | não | 9 | 3 | 11px | 7 | 3 | 1 | 1 | 0 | 924ms |
| cliente | @prestador | mobile | 2 | não | 20 | 0 | 11px | 6 | 3 | 0 | 0 | 0 | 825ms |
| cliente | /agenda | mobile | 2 | não | 8 | 2 | 10px | 7 | 3 | 0 | 0 | 0 | 1077ms |
| cliente | /meus-servicos | mobile | 2 | não | 19 | 0 | 10px | 7 | 3 | 0 | 1 | 0 | 814ms |
| cliente | /mensagens | mobile | 1 | não | 8 | 0 | 11px | 5 | 3 | 0 | 0 | 0 | 817ms |
| cliente | /notificacoes | mobile | 1 | não | 8 | 0 | 11px | 5 | 3 | 0 | 0 | 0 | 812ms |
| cliente | @perfil | mobile | 2 | não | 8 | 0 | 11px | 7 | 3 | 0 | 0 | 0 | 832ms |
| cliente | /perfil/editar | mobile | 2 | não | 8 | 0 | 11px | 6 | 3 | 0 | 0 | 0 | 784ms |
| cliente | /inicio | tablet | 1 | não | 14 | 1 | 10px | 8 | 4 | 0 | 0 | 0 | 911ms |
| cliente | /buscar-prestador | tablet | 1 | não | 9 | 3 | 11px | 7 | 4 | 1 | 1 | 0 | 967ms |
| cliente | @prestador | tablet | 2 | não | 20 | 0 | 11px | 7 | 4 | 0 | 0 | 0 | 1147ms |
| cliente | /agenda | tablet | 1 | não | 8 | 2 | 10px | 7 | 4 | 0 | 0 | 0 | 913ms |
| cliente | /meus-servicos | tablet | 2 | não | 19 | 0 | 10px | 7 | 4 | 0 | 1 | 0 | 793ms |
| cliente | /mensagens | tablet | 1 | não | 8 | 0 | 11px | 5 | 4 | 0 | 0 | 0 | 793ms |
| cliente | /notificacoes | tablet | 1 | não | 8 | 0 | 11px | 5 | 4 | 0 | 0 | 0 | 803ms |
| cliente | @perfil | tablet | 1 | não | 8 | 0 | 11px | 7 | 4 | 0 | 0 | 0 | 834ms |
| cliente | /perfil/editar | tablet | 2 | não | 8 | 0 | 11px | 7 | 4 | 0 | 0 | 0 | 818ms |
| cliente | /inicio | desktop | 1 | não | 14 | 1 | 10px | 8 | 4 | 0 | 0 | 0 | 815ms |
| cliente | /buscar-prestador | desktop | 1 | não | 9 | 3 | 11px | 7 | 4 | 1 | 1 | 0 | 964ms |
| cliente | @prestador | desktop | 2 | não | 20 | 0 | 11px | 7 | 4 | 0 | 0 | 0 | 859ms |
| cliente | /agenda | desktop | 1 | não | 8 | 2 | 10px | 7 | 4 | 0 | 0 | 0 | 1044ms |
| cliente | /meus-servicos | desktop | 2 | não | 19 | 0 | 10px | 7 | 4 | 0 | 1 | 0 | 852ms |
| cliente | /mensagens | desktop | 1 | não | 8 | 0 | 11px | 5 | 4 | 0 | 0 | 0 | 832ms |
| cliente | /notificacoes | desktop | 1 | não | 8 | 0 | 11px | 5 | 4 | 0 | 0 | 0 | 804ms |
| cliente | @perfil | desktop | 1 | não | 8 | 0 | 11px | 7 | 4 | 0 | 0 | 0 | 796ms |
| cliente | /perfil/editar | desktop | 2 | não | 8 | 0 | 11px | 7 | 4 | 0 | 0 | 0 | 818ms |
| cliente | /inicio (escuro) | mobile | 2 | não | 14 | 1 | 10px | 8 | 3 | 0 | 0 | 0 | 838ms |
| cliente | /buscar-prestador (escuro) | mobile | 2 | não | 9 | 3 | 11px | 7 | 3 | 1 | 1 | 0 | 834ms |
| cliente | /inicio (escuro) | desktop | 1 | não | 14 | 1 | 10px | 8 | 3 | 0 | 0 | 0 | 864ms |
| cliente | /buscar-prestador (escuro) | desktop | 1 | não | 9 | 3 | 11px | 7 | 3 | 1 | 1 | 0 | 819ms |
| prestador_servico | /inicio | mobile | 2 | não | 9 | 1 | 10px | 8 | 3 | 0 | 0 | 0 | 801ms |
| prestador_servico | /agenda | mobile | 3 | não | 8 | 10 | 9px | 8 | 3 | 0 | 0 | 0 | 776ms |
| prestador_servico | /clientes | mobile | 1 | não | 8 | 0 | 11px | 5 | 3 | 0 | 0 | 0 | 819ms |
| prestador_servico | @cliente | mobile | 2 | não | 10 | 0 | 10px | 7 | 3 | 0 | 1 | 0 | 1024ms |
| prestador_servico | @servico | mobile | 1 | não | 9 | 0 | 11px | 5 | 3 | 0 | 0 | 0 | 967ms |
| prestador_servico | /mapa | mobile | 1 | não | 9 | 3 | 11px | 7 | 3 | 1 | 0 | 0 | 842ms |
| prestador_servico | /mensagens | mobile | 1 | não | 8 | 0 | 11px | 5 | 3 | 0 | 0 | 0 | 828ms |
| prestador_servico | /notificacoes | mobile | 1 | não | 8 | 0 | 11px | 5 | 3 | 0 | 0 | 0 | 760ms |
| prestador_servico | @perfil | mobile | 4 | não | 8 | 0 | 11px | 7 | 30 | 0 | 0 | 0 | 819ms |
| prestador_servico | /perfil/editar | mobile | 2 | não | 8 | 0 | 11px | 6 | 3 | 0 | 0 | 0 | 853ms |
| prestador_servico | /inicio | tablet | 2 | não | 9 | 1 | 10px | 8 | 4 | 0 | 0 | 0 | 810ms |
| prestador_servico | /agenda | tablet | 2 | não | 8 | 10 | 9px | 8 | 4 | 0 | 0 | 0 | 1087ms |
| prestador_servico | /clientes | tablet | 1 | não | 8 | 0 | 11px | 5 | 4 | 0 | 0 | 0 | 816ms |
| prestador_servico | @cliente | tablet | 2 | não | 10 | 0 | 10px | 8 | 4 | 0 | 1 | 0 | 818ms |
| prestador_servico | @servico | tablet | 1 | não | 9 | 0 | 11px | 6 | 4 | 0 | 0 | 0 | 844ms |
| prestador_servico | /mapa | tablet | 1 | não | 9 | 3 | 11px | 7 | 4 | 1 | 0 | 0 | 839ms |
| prestador_servico | /mensagens | tablet | 1 | não | 8 | 0 | 11px | 5 | 4 | 0 | 0 | 0 | 807ms |
| prestador_servico | /notificacoes | tablet | 1 | não | 8 | 0 | 11px | 5 | 4 | 0 | 0 | 0 | 1149ms |
| prestador_servico | @perfil | tablet | 3 | não | 8 | 0 | 11px | 7 | 31 | 0 | 0 | 0 | 1629ms |
| prestador_servico | /perfil/editar | tablet | 2 | não | 8 | 0 | 11px | 7 | 4 | 0 | 0 | 0 | 813ms |
| prestador_servico | /inicio | desktop | 2 | não | 9 | 1 | 10px | 8 | 4 | 0 | 0 | 0 | 816ms |
| prestador_servico | /agenda | desktop | 2 | não | 8 | 10 | 9px | 8 | 4 | 0 | 0 | 0 | 803ms |
| prestador_servico | /clientes | desktop | 1 | não | 8 | 0 | 11px | 5 | 4 | 0 | 0 | 0 | 771ms |
| prestador_servico | @cliente | desktop | 2 | não | 10 | 0 | 10px | 8 | 4 | 0 | 1 | 0 | 820ms |
| prestador_servico | @servico | desktop | 1 | não | 9 | 0 | 11px | 6 | 4 | 0 | 0 | 0 | 805ms |
| prestador_servico | /mapa | desktop | 1 | não | 9 | 3 | 11px | 7 | 4 | 1 | 0 | 0 | 829ms |
| prestador_servico | /mensagens | desktop | 1 | não | 8 | 0 | 11px | 5 | 4 | 0 | 0 | 0 | 788ms |
| prestador_servico | /notificacoes | desktop | 1 | não | 8 | 0 | 11px | 5 | 4 | 0 | 0 | 0 | 842ms |
| prestador_servico | @perfil | desktop | 3 | não | 8 | 0 | 11px | 7 | 31 | 0 | 0 | 0 | 800ms |
| prestador_servico | /perfil/editar | desktop | 2 | não | 8 | 0 | 11px | 7 | 4 | 0 | 0 | 0 | 779ms |
| prestador_servico | /inicio (escuro) | mobile | 2 | não | 9 | 1 | 10px | 8 | 3 | 0 | 0 | 0 | 813ms |
| prestador_servico | /agenda (escuro) | mobile | 3 | não | 8 | 10 | 9px | 8 | 3 | 0 | 0 | 0 | 823ms |
| prestador_servico | /inicio (escuro) | desktop | 2 | não | 9 | 1 | 10px | 8 | 3 | 0 | 0 | 0 | 849ms |
| prestador_servico | /agenda (escuro) | desktop | 2 | não | 8 | 10 | 9px | 8 | 3 | 0 | 0 | 0 | 807ms |
| admin | /inicio | mobile | 2 | não | 8 | 1 | 11px | 7 | 3 | 0 | 0 | 0 | 1008ms |
| admin | /minhas-vagas | mobile | 1 | não | 8 | 0 | 11px | 6 | 3 | 0 | 0 | 0 | 1047ms |
| admin | /equipe | mobile | 2 | não | 8 | 0 | 11px | 6 | 3 | 0 | 0 | 0 | 1014ms |
| admin | /mapa | mobile | 1 | não | 8 | 0 | 11px | 6 | 3 | 0 | 0 | 0 | 1004ms |
| admin | /financeiro | mobile | 2 | não | 8 | 0 | 11px | 6 | 3 | 0 | 0 | 0 | 969ms |
| admin | /relatorios | mobile | 2 | não | 8 | 0 | 11px | 6 | 3 | 0 | 0 | 0 | 1285ms |
| admin | /notificacoes | mobile | 1 | não | 8 | 0 | 11px | 6 | 3 | 0 | 0 | 0 | 1149ms |
| admin | @perfil | mobile | 2 | não | 8 | 0 | 11px | 7 | 3 | 0 | 0 | 0 | 1017ms |
| admin | /inicio | tablet | 1 | não | 8 | 1 | 11px | 7 | 4 | 0 | 0 | 0 | 1001ms |
| admin | /minhas-vagas | tablet | 1 | não | 8 | 0 | 11px | 6 | 4 | 0 | 0 | 0 | 1090ms |
| admin | /equipe | tablet | 1 | não | 8 | 0 | 11px | 6 | 4 | 0 | 0 | 0 | 984ms |
| admin | /mapa | tablet | 1 | não | 8 | 0 | 11px | 6 | 4 | 0 | 0 | 0 | 1053ms |
| admin | /financeiro | tablet | 1 | não | 8 | 0 | 11px | 6 | 4 | 0 | 0 | 0 | 1044ms |
| admin | /relatorios | tablet | 1 | não | 8 | 0 | 11px | 6 | 4 | 0 | 0 | 0 | 1049ms |
| admin | /notificacoes | tablet | 1 | não | 8 | 0 | 11px | 6 | 4 | 0 | 0 | 0 | 1004ms |
| admin | @perfil | tablet | 2 | não | 8 | 0 | 11px | 7 | 4 | 0 | 0 | 0 | 1044ms |
| admin | /inicio | desktop | 1 | não | 8 | 1 | 11px | 7 | 4 | 0 | 0 | 0 | 1119ms |
| admin | /minhas-vagas | desktop | 1 | não | 8 | 0 | 11px | 6 | 4 | 0 | 0 | 0 | 999ms |
| admin | /equipe | desktop | 1 | não | 8 | 0 | 11px | 6 | 4 | 0 | 0 | 0 | 985ms |
| admin | /mapa | desktop | 1 | não | 8 | 0 | 11px | 6 | 4 | 0 | 0 | 0 | 994ms |
| admin | /financeiro | desktop | 1 | não | 8 | 0 | 11px | 6 | 4 | 0 | 0 | 0 | 1237ms |
| admin | /relatorios | desktop | 1 | não | 8 | 0 | 11px | 6 | 4 | 0 | 0 | 0 | 1019ms |
| admin | /notificacoes | desktop | 1 | não | 8 | 0 | 11px | 6 | 4 | 0 | 0 | 0 | 968ms |
| admin | @perfil | desktop | 2 | não | 8 | 0 | 11px | 7 | 4 | 0 | 0 | 0 | 1054ms |
| sysadmin | /inicio | mobile | 1 | não | 8 | 1 | 11px | 7 | 3 | 0 | 0 | 0 | 808ms |
| sysadmin | /admin/usuarios | mobile | 2 | não | 8 | 0 | 10px | 7 | 3 | 0 | 0 | 0 | 864ms |
| sysadmin | /admin/denuncias | mobile | 1 | não | 8 | 0 | 11px | 5 | 3 | 0 | 0 | 0 | 787ms |
| sysadmin | /admin/demanda | mobile | 1 | não | 9 | 1 | 11px | 5 | 3 | 0 | 1 | 0 | 812ms |
| sysadmin | /admin/metricas | mobile | 2 | não | 8 | 0 | 11px | 7 | 3 | 0 | 0 | 0 | 813ms |
| sysadmin | /admin/logs | mobile | 2 | não | 8 | 2 | 11px | 6 | 3 | 0 | 0 | 0 | 833ms |
| sysadmin | /admin/servicos | mobile | 7 | não | 8 | 0 | 11px | 6 | 3 | 0 | 30 | 0 | 821ms |
| sysadmin | @perfil | mobile | 2 | não | 8 | 0 | 11px | 7 | 3 | 0 | 0 | 0 | 901ms |
| sysadmin | /inicio | tablet | 1 | não | 8 | 1 | 11px | 7 | 4 | 0 | 0 | 0 | 824ms |
| sysadmin | /admin/usuarios | tablet | 2 | não | 8 | 0 | 10px | 7 | 4 | 0 | 0 | 0 | 847ms |
| sysadmin | /admin/denuncias | tablet | 1 | não | 8 | 0 | 11px | 5 | 4 | 0 | 0 | 0 | 824ms |
| sysadmin | /admin/demanda | tablet | 1 | não | 9 | 1 | 11px | 5 | 4 | 0 | 1 | 0 | 789ms |
| sysadmin | /admin/metricas | tablet | 1 | não | 8 | 0 | 11px | 7 | 4 | 0 | 0 | 0 | 800ms |
| sysadmin | /admin/logs | tablet | 2 | não | 8 | 2 | 11px | 6 | 4 | 0 | 0 | 0 | 819ms |
| sysadmin | /admin/servicos | tablet | 5 | não | 8 | 0 | 11px | 6 | 4 | 0 | 30 | 0 | 788ms |
| sysadmin | @perfil | tablet | 1 | não | 8 | 0 | 11px | 7 | 4 | 0 | 0 | 0 | 820ms |
| sysadmin | /inicio | desktop | 1 | não | 8 | 1 | 11px | 7 | 4 | 0 | 0 | 0 | 813ms |
| sysadmin | /admin/usuarios | desktop | 2 | não | 8 | 0 | 10px | 7 | 4 | 0 | 0 | 0 | 873ms |
| sysadmin | /admin/denuncias | desktop | 1 | não | 8 | 0 | 11px | 5 | 4 | 0 | 0 | 0 | 846ms |
| sysadmin | /admin/demanda | desktop | 1 | não | 9 | 1 | 11px | 5 | 4 | 0 | 1 | 0 | 854ms |
| sysadmin | /admin/metricas | desktop | 1 | não | 8 | 0 | 11px | 7 | 4 | 0 | 0 | 0 | 819ms |
| sysadmin | /admin/logs | desktop | 1 | não | 8 | 2 | 11px | 6 | 4 | 0 | 0 | 0 | 814ms |
| sysadmin | /admin/servicos | desktop | 6 | não | 8 | 0 | 11px | 6 | 4 | 0 | 30 | 0 | 896ms |
| sysadmin | @perfil | desktop | 1 | não | 8 | 0 | 11px | 7 | 4 | 0 | 0 | 0 | 873ms |
| funcionario | /inicio | mobile | 1 | não | 8 | 0 | 11px | 6 | 3 | 0 | 0 | 0 | 930ms |
| funcionario | /inicio | tablet | 1 | não | 8 | 0 | 11px | 7 | 4 | 0 | 0 | 0 | 1218ms |
| funcionario | /inicio | desktop | 1 | não | 8 | 0 | 11px | 7 | 4 | 0 | 0 | 0 | 961ms |

## Performance — celular médio (4G lenta + CPU 4x, cache frio)

| papel | página | TTFB | FCP | LCP | CLS | TBT | KB total | req. |
|---|---|---|---|---|---|---|---|---|
| anon | / | 192ms | 740ms | 740ms | 0 | 68ms | 274 | 18 |
| anon | /login | 6ms | 576ms | 576ms | 0 | 64ms | 141 | 15 |
| cliente | /inicio | 860ms | 1236ms | 1668ms | 0.061 | 57ms | 156 | 22 |
| cliente | /buscar-prestador | 821ms | 1220ms | 4172ms | 0 | 67ms | 198 | 35 |
| prestador_servico | /inicio | 849ms | 1208ms | 2460ms | 0.203 | 143ms | 156 | 23 |
| prestador_servico | /agenda | 872ms | 1236ms | 1720ms | 0.002 | 70ms | 149 | 16 |
| prestador_servico | /mapa | 1071ms | 1524ms | 4072ms | 0 | 69ms | 195 | 30 |
