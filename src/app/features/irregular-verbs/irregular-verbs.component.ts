import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface IrregularVerb {
  v1: string; v2: string; v3: string; ing: string; tamil: string; example: string; exampleTamil: string;
}

const VERBS: IrregularVerb[] = [
  {v1:'be',v2:'was/were',v3:'been',ing:'being',tamil:'இரு / ஆகு',example:'I have been busy today.',exampleTamil:'இன்று நான் வேலையாக இருந்தேன்.'},
  {v1:'beat',v2:'beat',v3:'beaten',ing:'beating',tamil:'அடி / தோற்கடி',example:'Our team beat the other team.',exampleTamil:'எங்கள் அணி மற்ற அணியைத் தோற்கடித்தது.'},
  {v1:'become',v2:'became',v3:'become',ing:'becoming',tamil:'ஆகு',example:'She became a teacher.',exampleTamil:'அவள் ஆசிரியரானாள்.'},
  {v1:'begin',v2:'began',v3:'begun',ing:'beginning',tamil:'தொடங்கு',example:'The class began at nine.',exampleTamil:'வகுப்பு ஒன்பது மணிக்குத் தொடங்கியது.'},
  {v1:'bend',v2:'bent',v3:'bent',ing:'bending',tamil:'வளை',example:'Bend your knees slowly.',exampleTamil:'உங்கள் முழங்கால்களை மெதுவாக வளைக்கவும்.'},
  {v1:'bet',v2:'bet',v3:'bet',ing:'betting',tamil:'பந்தயம் கட்டு',example:'He bet on the match.',exampleTamil:'அவர் போட்டியில் பந்தயம் கட்டினார்.'},
  {v1:'bind',v2:'bound',v3:'bound',ing:'binding',tamil:'கட்டு / பிணை',example:'Please bind these papers.',exampleTamil:'இந்தக் காகிதங்களைக் கட்டுங்கள்.'},
  {v1:'bite',v2:'bit',v3:'bitten',ing:'biting',tamil:'கடி',example:'The dog bit the ball.',exampleTamil:'நாய் பந்தைக் கடித்தது.'},
  {v1:'bleed',v2:'bled',v3:'bled',ing:'bleeding',tamil:'இரத்தம் கசிவு',example:'His finger is bleeding.',exampleTamil:'அவரது விரலில் இரத்தம் வருகிறது.'},
  {v1:'blow',v2:'blew',v3:'blown',ing:'blowing',tamil:'ஊது',example:'The wind blew strongly.',exampleTamil:'காற்று பலமாக வீசியது.'},
  {v1:'break',v2:'broke',v3:'broken',ing:'breaking',tamil:'உடை',example:'I have broken the glass.',exampleTamil:'நான் கண்ணாடியை உடைத்துவிட்டேன்.'},
  {v1:'bring',v2:'brought',v3:'brought',ing:'bringing',tamil:'கொண்டு வா',example:'She brought some food.',exampleTamil:'அவள் சிறிது உணவு கொண்டு வந்தாள்.'},
  {v1:'build',v2:'built',v3:'built',ing:'building',tamil:'கட்டு',example:'They built a new house.',exampleTamil:'அவர்கள் புதிய வீடு கட்டினார்கள்.'},
  {v1:'burn',v2:'burnt/burned',v3:'burnt/burned',ing:'burning',tamil:'எரி / எரித்தல்',example:'The paper burned quickly.',exampleTamil:'காகிதம் விரைவாக எரிந்தது.'},
  {v1:'buy',v2:'bought',v3:'bought',ing:'buying',tamil:'வாங்கு',example:'I bought a new phone.',exampleTamil:'நான் புதிய கைப்பேசி வாங்கினேன்.'},
  {v1:'catch',v2:'caught',v3:'caught',ing:'catching',tamil:'பிடி',example:'He caught the bus.',exampleTamil:'அவர் பேருந்தைப் பிடித்தார்.'},
  {v1:'choose',v2:'chose',v3:'chosen',ing:'choosing',tamil:'தேர்ந்தெடு',example:'Choose the correct answer.',exampleTamil:'சரியான பதிலைத் தேர்ந்தெடுக்கவும்.'},
  {v1:'come',v2:'came',v3:'come',ing:'coming',tamil:'வா',example:'My friend came yesterday.',exampleTamil:'என் நண்பர் நேற்று வந்தார்.'},
  {v1:'cost',v2:'cost',v3:'cost',ing:'costing',tamil:'விலை ஆகு',example:'The bag cost five hundred rupees.',exampleTamil:'அந்தப் பையின் விலை ஐநூறு ரூபாய்.'},
  {v1:'cut',v2:'cut',v3:'cut',ing:'cutting',tamil:'வெட்டு',example:'She cut the paper.',exampleTamil:'அவள் காகிதத்தை வெட்டினாள்.'},
  {v1:'deal',v2:'dealt',v3:'dealt',ing:'dealing',tamil:'கையாளு',example:'He dealt with the problem.',exampleTamil:'அவர் பிரச்சினையைக் கையாண்டார்.'},
  {v1:'dig',v2:'dug',v3:'dug',ing:'digging',tamil:'தோண்டு',example:'They dug a small hole.',exampleTamil:'அவர்கள் ஒரு சிறிய குழி தோண்டினார்கள்.'},
  {v1:'do',v2:'did',v3:'done',ing:'doing',tamil:'செய்',example:'I have done my work.',exampleTamil:'நான் என் வேலையைச் செய்துவிட்டேன்.'},
  {v1:'draw',v2:'drew',v3:'drawn',ing:'drawing',tamil:'வரை',example:'He drew a picture.',exampleTamil:'அவர் ஒரு படம் வரைந்தார்.'},
  {v1:'drink',v2:'drank',v3:'drunk',ing:'drinking',tamil:'குடி',example:'She drank some water.',exampleTamil:'அவள் சிறிது தண்ணீர் குடித்தாள்.'},
  {v1:'drive',v2:'drove',v3:'driven',ing:'driving',tamil:'ஓட்டு',example:'I drove to work.',exampleTamil:'நான் வேலைக்குக் காரில் சென்றேன்.'},
  {v1:'eat',v2:'ate',v3:'eaten',ing:'eating',tamil:'சாப்பிடு',example:'We have eaten lunch.',exampleTamil:'நாங்கள் மதிய உணவு சாப்பிட்டுவிட்டோம்.'},
  {v1:'fall',v2:'fell',v3:'fallen',ing:'falling',tamil:'விழு',example:'The child fell down.',exampleTamil:'குழந்தை கீழே விழுந்தது.'},
  {v1:' feed',v2:'fed',v3:'fed',ing:'feeding',tamil:'உணவளி',example:'She fed the baby.',exampleTamil:'அவள் குழந்தைக்கு உணவளித்தாள்.'},
  {v1:'feel',v2:'felt',v3:'felt',ing:'feeling',tamil:'உணர்',example:'I felt tired yesterday.',exampleTamil:'நேற்று எனக்கு சோர்வாக இருந்தது.'},
  {v1:'fight',v2:'fought',v3:'fought',ing:'fighting',tamil:'சண்டையிடு',example:'They fought for their rights.',exampleTamil:'அவர்கள் தங்கள் உரிமைகளுக்காகப் போராடினார்கள்.'},
  {v1:'find',v2:'found',v3:'found',ing:'finding',tamil:'கண்டுபிடி',example:'I found my keys.',exampleTamil:'என் சாவிகளைக் கண்டுபிடித்தேன்.'},
  {v1:'fly',v2:'flew',v3:'flown',ing:'flying',tamil:'பற',example:'The bird flew away.',exampleTamil:'பறவை பறந்து சென்றது.'},
  {v1:'forget',v2:'forgot',v3:'forgotten',ing:'forgetting',tamil:'மற',example:'I forgot his name.',exampleTamil:'அவருடைய பெயரை நான் மறந்துவிட்டேன்.'},
  {v1:'forgive',v2:'forgave',v3:'forgiven',ing:'forgiving',tamil:'மன்னி',example:'Please forgive me.',exampleTamil:'தயவுசெய்து என்னை மன்னியுங்கள்.'},
  {v1:'freeze',v2:'froze',v3:'frozen',ing:'freezing',tamil:'உறை',example:'The water froze overnight.',exampleTamil:'இரவில் தண்ணீர் உறைந்தது.'},
  {v1:'get',v2:'got',v3:'got/gotten',ing:'getting',tamil:'பெறு / கிடை',example:'I got your message.',exampleTamil:'உங்கள் செய்தி எனக்குக் கிடைத்தது.'},
  {v1:'give',v2:'gave',v3:'given',ing:'giving',tamil:'கொடு',example:'She gave me a gift.',exampleTamil:'அவள் எனக்கு ஒரு பரிசு கொடுத்தாள்.'},
  {v1:'go',v2:'went',v3:'gone',ing:'going',tamil:'போ',example:'He went to the office.',exampleTamil:'அவர் அலுவலகத்திற்குச் சென்றார்.'},
  {v1:'grow',v2:'grew',v3:'grown',ing:'growing',tamil:'வளர்',example:'The plants grew quickly.',exampleTamil:'செடிகள் விரைவாக வளர்ந்தன.'},
  {v1:'hang',v2:'hung',v3:'hung',ing:'hanging',tamil:'தொங்கு / தொங்கவிடு',example:'He hung the picture on the wall.',exampleTamil:'அவர் படத்தைச் சுவரில் தொங்கவிட்டார்.'},
  {v1:'have',v2:'had',v3:'had',ing:'having',tamil:'வை / உடையிரு',example:'We had a good time.',exampleTamil:'நாங்கள் மகிழ்ச்சியாக நேரம் கழித்தோம்.'},
  {v1:'hear',v2:'heard',v3:'heard',ing:'hearing',tamil:'கேள்',example:'I heard a loud noise.',exampleTamil:'நான் பெரிய சத்தத்தைக் கேட்டேன்.'},
  {v1:'hide',v2:'hid',v3:'hidden',ing:'hiding',tamil:'மறை',example:'The cat hid under the bed.',exampleTamil:'பூனை படுக்கைக்குக் கீழே மறைந்தது.'},
  {v1:'hit',v2:'hit',v3:'hit',ing:'hitting',tamil:'அடி',example:'He hit the ball.',exampleTamil:'அவர் பந்தை அடித்தார்.'},
  {v1:'hold',v2:'held',v3:'held',ing:'holding',tamil:'பிடித்திரு',example:'Hold my hand.',exampleTamil:'என் கையைப் பிடித்துக்கொள்ளுங்கள்.'},
  {v1:'hurt',v2:'hurt',v3:'hurt',ing:'hurting',tamil:'காயப்படுத்து / வலி',example:'I hurt my leg.',exampleTamil:'என் காலில் காயம் ஏற்பட்டது.'},
  {v1:'keep',v2:'kept',v3:'kept',ing:'keeping',tamil:'வைத்திரு',example:'Keep your room clean.',exampleTamil:'உங்கள் அறையைச் சுத்தமாக வைத்திருங்கள்.'},
  {v1:'know',v2:'knew',v3:'known',ing:'knowing',tamil:'தெரிந்துகொள் / அறி',example:'I knew the answer.',exampleTamil:'எனக்கு பதில் தெரிந்திருந்தது.'},
  {v1:'lead',v2:'led',v3:'led',ing:'leading',tamil:'வழிநடத்து',example:'She led the team.',exampleTamil:'அவள் அணியை வழிநடத்தினாள்.'},
  {v1:'leave',v2:'left',v3:'left',ing:'leaving',tamil:'விட்டுச் செல்',example:'They left early.',exampleTamil:'அவர்கள் சீக்கிரமாகப் புறப்பட்டார்கள்.'},
  {v1:'lend',v2:'lent',v3:'lent',ing:'lending',tamil:'கடனாகக் கொடு',example:'Can you lend me a pen?',exampleTamil:'எனக்கு ஒரு பேனாவைக் கடனாகத் தர முடியுமா?'},
  {v1:'let',v2:'let',v3:'let',ing:'letting',tamil:'அனுமதி',example:'Let me explain.',exampleTamil:'என்னை விளக்க அனுமதியுங்கள்.'},
  {v1:'lie',v2:'lay',v3:'lain',ing:'lying',tamil:'படுத்து இரு',example:'He lay on the sofa.',exampleTamil:'அவர் சோபாவில் படுத்திருந்தார்.'},
  {v1:'light',v2:'lit/lighted',v3:'lit/lighted',ing:'lighting',tamil:'ஏற்று / ஒளியூட்டு',example:'She lit a candle.',exampleTamil:'அவள் ஒரு மெழுகுவர்த்தியை ஏற்றினாள்.'},
  {v1:'lose',v2:'lost',v3:'lost',ing:'losing',tamil:'இழ',example:'I lost my wallet.',exampleTamil:'என் பணப்பையை இழந்துவிட்டேன்.'},
  {v1:'make',v2:'made',v3:'made',ing:'making',tamil:'உருவாக்கு / செய்',example:'He made a mistake.',exampleTamil:'அவர் ஒரு தவறு செய்தார்.'},
  {v1:'mean',v2:'meant',v3:'meant',ing:'meaning',tamil:'அர்த்தம் கொள்',example:'What does this word mean?',exampleTamil:'இந்தச் சொல்லுக்கு என்ன அர்த்தம்?'},
  {v1:'meet',v2:'met',v3:'met',ing:'meeting',tamil:'சந்தி',example:'I met my friend.',exampleTamil:'நான் என் நண்பரைச் சந்தித்தேன்.'},
  {v1:'pay',v2:'paid',v3:'paid',ing:'paying',tamil:'செலுத்து',example:'She paid the bill.',exampleTamil:'அவள் கட்டணத்தைச் செலுத்தினாள்.'},
  {v1:'put',v2:'put',v3:'put',ing:'putting',tamil:'வை',example:'Put the book on the table.',exampleTamil:'புத்தகத்தை மேசையின் மீது வையுங்கள்.'},
  {v1:'read',v2:'read',v3:'read',ing:'reading',tamil:'படி',example:'I read that book last week.',exampleTamil:'கடந்த வாரம் அந்தப் புத்தகத்தைப் படித்தேன்.'},
  {v1:'ride',v2:'rode',v3:'ridden',ing:'riding',tamil:'சவாரி செய்',example:'He rode a bicycle.',exampleTamil:'அவர் மிதிவண்டி ஓட்டினார்.'},
  {v1:'ring',v2:'rang',v3:'rung',ing:'ringing',tamil:'மணி அடி',example:'The phone rang twice.',exampleTamil:'தொலைபேசி இரண்டு முறை ஒலித்தது.'},
  {v1:'rise',v2:'rose',v3:'risen',ing:'rising',tamil:'எழு / உயரு',example:'The sun rose early.',exampleTamil:'சூரியன் சீக்கிரமாக உதித்தது.'},
  {v1:'run',v2:'ran',v3:'run',ing:'running',tamil:'ஓடு',example:'She ran very fast.',exampleTamil:'அவள் மிக வேகமாக ஓடினாள்.'},
  {v1:'say',v2:'said',v3:'said',ing:'saying',tamil:'சொல்',example:'He said hello.',exampleTamil:'அவர் வணக்கம் சொன்னார்.'},
  {v1:'see',v2:'saw',v3:'seen',ing:'seeing',tamil:'பார்',example:'I saw a rainbow.',exampleTamil:'நான் வானவில் பார்த்தேன்.'},
  {v1:'sell',v2:'sold',v3:'sold',ing:'selling',tamil:'விற்',example:'They sold their old car.',exampleTamil:'அவர்கள் தங்கள் பழைய காரை விற்றார்கள்.'},
  {v1:'send',v2:'sent',v3:'sent',ing:'sending',tamil:'அனுப்பு',example:'I sent an email.',exampleTamil:'நான் ஒரு மின்னஞ்சல் அனுப்பினேன்.'},
  {v1:'set',v2:'set',v3:'set',ing:'setting',tamil:'அமை',example:'Set the alarm for six.',exampleTamil:'அலாரத்தை ஆறு மணிக்கு அமைக்கவும்.'},
  {v1:'shake',v2:'shook',v3:'shaken',ing:'shaking',tamil:'குலுக்கு',example:'He shook my hand.',exampleTamil:'அவர் என் கையைக் குலுக்கினார்.'},
  {v1:'shine',v2:'shone',v3:'shone',ing:'shining',tamil:'பிரகாசி',example:'The stars shone brightly.',exampleTamil:'நட்சத்திரங்கள் பிரகாசமாக ஒளிர்ந்தன.'},
  {v1:'shoot',v2:'shot',v3:'shot',ing:'shooting',tamil:'சுடு',example:'The player shot the ball.',exampleTamil:'வீரர் பந்தை உதைத்தார்.'},
  {v1:'show',v2:'showed',v3:'shown',ing:'showing',tamil:'காட்டு',example:'Please show me the way.',exampleTamil:'தயவுசெய்து எனக்கு வழியைக் காட்டுங்கள்.'},
  {v1:'shut',v2:'shut',v3:'shut',ing:'shutting',tamil:'மூடு',example:'Shut the door, please.',exampleTamil:'தயவுசெய்து கதவை மூடுங்கள்.'},
  {v1:'sing',v2:'sang',v3:'sung',ing:'singing',tamil:'பாடு',example:'She sang a beautiful song.',exampleTamil:'அவள் அழகான பாடல் பாடினாள்.'},
  {v1:'sink',v2:'sank',v3:'sunk',ing:'sinking',tamil:'மூழ்கு',example:'The stone sank in the water.',exampleTamil:'கல் தண்ணீரில் மூழ்கியது.'},
  {v1:'sit',v2:'sat',v3:'sat',ing:'sitting',tamil:'உட்கார்',example:'Please sit here.',exampleTamil:'தயவுசெய்து இங்கே உட்காருங்கள்.'},
  {v1:'sleep',v2:'slept',v3:'slept',ing:'sleeping',tamil:'தூங்கு',example:'The baby slept well.',exampleTamil:'குழந்தை நன்றாகத் தூங்கியது.'},
  {v1:'speak',v2:'spoke',v3:'spoken',ing:'speaking',tamil:'பேசு',example:'I have spoken to him.',exampleTamil:'நான் அவரிடம் பேசியிருக்கிறேன்.'},
  {v1:'spend',v2:'spent',v3:'spent',ing:'spending',tamil:'செலவிடு / கழி',example:'We spent the evening together.',exampleTamil:'நாங்கள் மாலையை ஒன்றாகக் கழித்தோம்.'},
  {v1:'stand',v2:'stood',v3:'stood',ing:'standing',tamil:'நில்',example:'He stood near the gate.',exampleTamil:'அவர் வாசலுக்கு அருகில் நின்றார்.'},
  {v1:'steal',v2:'stole',v3:'stolen',ing:'stealing',tamil:'திருடு',example:'Someone stole my bicycle.',exampleTamil:'யாரோ என் மிதிவண்டியைத் திருடினார்கள்.'},
  {v1:'swim',v2:'swam',v3:'swum',ing:'swimming',tamil:'நீந்து',example:'They swam in the pool.',exampleTamil:'அவர்கள் நீச்சல் குளத்தில் நீந்தினார்கள்.'},
  {v1:'take',v2:'took',v3:'taken',ing:'taking',tamil:'எடு / எடுத்துச் செல்',example:'I took a photograph.',exampleTamil:'நான் ஒரு புகைப்படம் எடுத்தேன்.'},
  {v1:'teach',v2:'taught',v3:'taught',ing:'teaching',tamil:'கற்பி',example:'She taught English.',exampleTamil:'அவள் ஆங்கிலம் கற்பித்தாள்.'},
  {v1:'tear',v2:'tore',v3:'torn',ing:'tearing',tamil:'கிழி',example:'He tore the paper.',exampleTamil:'அவர் காகிதத்தைக் கிழித்தார்.'},
  {v1:'tell',v2:'told',v3:'told',ing:'telling',tamil:'சொல் / கூறு',example:'Tell me the truth.',exampleTamil:'என்னிடம் உண்மையைச் சொல்லுங்கள்.'},
  {v1:'think',v2:'thought',v3:'thought',ing:'thinking',tamil:'நினை / யோசி',example:'I thought about your idea.',exampleTamil:'உங்கள் யோசனையைப் பற்றி நான் சிந்தித்தேன்.'},
  {v1:'throw',v2:'threw',v3:'thrown',ing:'throwing',tamil:'எறி',example:'He threw the ball.',exampleTamil:'அவர் பந்தை எறிந்தார்.'},
  {v1:'understand',v2:'understood',v3:'understood',ing:'understanding',tamil:'புரிந்துகொள்',example:'I understood the lesson.',exampleTamil:'எனக்குப் பாடம் புரிந்தது.'},
  {v1:'wake',v2:'woke',v3:'woken',ing:'waking',tamil:'விழித்தெழு',example:'I woke up early.',exampleTamil:'நான் சீக்கிரமாக விழித்தெழுந்தேன்.'},
  {v1:'wear',v2:'wore',v3:'worn',ing:'wearing',tamil:'அணி',example:'She wore a blue dress.',exampleTamil:'அவள் நீல நிற ஆடை அணிந்திருந்தாள்.'},
  {v1:'win',v2:'won',v3:'won',ing:'winning',tamil:'வெற்றி பெறு',example:'Our team won the game.',exampleTamil:'எங்கள் அணி போட்டியில் வென்றது.'},
  {v1:'write',v2:'wrote',v3:'written',ing:'writing',tamil:'எழுது',example:'He has written a letter.',exampleTamil:'அவர் ஒரு கடிதம் எழுதியுள்ளார்.'}
,
  {v1:'alight',v2:'alighted/alit',v3:'alighted/alit',ing:'alighting',tamil:'இறங்கு',example:'The bird alighted on the branch.',exampleTamil:'பறவை கிளையில் வந்து அமர்ந்தது.'},
  {v1:'arise',v2:'arose',v3:'arisen',ing:'arising',tamil:'எழு / தோன்று',example:'A new problem arose.',exampleTamil:'ஒரு புதிய பிரச்சினை ஏற்பட்டது.'},
  {v1:'awake',v2:'awoke',v3:'awoken',ing:'awaking',tamil:'விழித்தெழு',example:'She awoke before sunrise.',exampleTamil:'சூரிய உதயத்திற்கு முன் அவள் விழித்தெழுந்தாள்.'},
  {v1:'befall',v2:'befell',v3:'befallen',ing:'befalling',tamil:'நேரிடு',example:'A difficult time befell them.',exampleTamil:'அவர்களுக்கு கடினமான காலம் நேர்ந்தது.'},
  {v1:'beget',v2:'begot',v3:'begotten',ing:'begetting',tamil:'உண்டாக்கு',example:'One mistake begot another.',exampleTamil:'ஒரு தவறு மற்றொன்றை உண்டாக்கியது.'},
  {v1:'behold',v2:'beheld',v3:'beheld',ing:'beholding',tamil:'காண்',example:'We beheld the beautiful view.',exampleTamil:'அழகான காட்சியைக் கண்டோம்.'},
  {v1:'beset',v2:'beset',v3:'beset',ing:'besetting',tamil:'சூழ்ந்து தாக்கு',example:'The team was beset by problems.',exampleTamil:'அந்தக் குழுவைச் சிக்கல்கள் சூழ்ந்தன.'},
  {v1:'bespeak',v2:'bespoke',v3:'bespoken',ing:'bespeaking',tamil:'வெளிப்படுத்து / குறிக்க',example:'His actions bespeak confidence.',exampleTamil:'அவரது செயல்கள் தன்னம்பிக்கையை வெளிப்படுத்துகின்றன.'},
  {v1:'beseech',v2:'besought',v3:'besought',ing:'beseeching',tamil:'கெஞ்சிக் கேள்',example:'She besought him to stay.',exampleTamil:'தங்கும்படி அவள் அவரிடம் கெஞ்சினாள்.'},
  {v1:'bestride',v2:'bestrode',v3:'bestridden',ing:'bestriding',tamil:'கால்களைப் போட்டு அமர்',example:'The rider bestride the horse.',exampleTamil:'சவாரி செய்பவர் குதிரை மீது அமர்ந்தார்.'},
  {v1:'bethink',v2:'bethought',v3:'bethought',ing:'bethinking',tamil:'சிந்தித்துப் பார்',example:'He bethought himself of a solution.',exampleTamil:'அவர் ஒரு தீர்வைப் பற்றி சிந்தித்தார்.'},
  {v1:'bid',v2:'bid/bade',v3:'bid/bidden',ing:'bidding',tamil:'ஏலம் கேள் / கட்டளையிடு',example:'They bid for the old painting.',exampleTamil:'அவர்கள் பழைய ஓவியத்திற்கு ஏலம் கேட்டனர்.'},
  {v1:'broadcast',v2:'broadcast',v3:'broadcast',ing:'broadcasting',tamil:'ஒளிபரப்பு செய்',example:'The station broadcast the news.',exampleTamil:'அந்த நிலையம் செய்தியை ஒளிபரப்பியது.'},
  {v1:'browbeat',v2:'browbeat',v3:'browbeaten',ing:'browbeating',tamil:'மிரட்டி அடக்கு',example:'Do not let anyone browbeat you.',exampleTamil:'யாரும் உங்களை மிரட்டி அடக்க விடாதீர்கள்.'},
  {v1:'come undone',v2:'came undone',v3:'come undone',ing:'coming undone',tamil:'அவிழ்ந்து போ',example:'The knot came undone.',exampleTamil:'முடிச்சு அவிழ்ந்துவிட்டது.'},
  {v1:'crossbreed',v2:'crossbred',v3:'crossbred',ing:'crossbreeding',tamil:'கலப்பினம் உருவாக்கு',example:'Farmers crossbred the plants.',exampleTamil:'விவசாயிகள் செடிகளைக் கலப்பினம் செய்தனர்.'},
  {v1:'daydream',v2:'daydreamt/daydreamed',v3:'daydreamt/daydreamed',ing:'daydreaming',tamil:'பகற்கனவு காண்',example:'He daydreamt during the lesson.',exampleTamil:'பாடத்தின் போது அவர் பகற்கனவு கண்டார்.'},
  {v1:'mislead',v2:'misled',v3:'misled',ing:'misleading',tamil:'தவறாக வழிநடத்து',example:'False news misled many people.',exampleTamil:'பொய்ச் செய்தி பலரைத் தவறாக வழிநடத்தியது.'},
  {v1:'misread',v2:'misread',v3:'misread',ing:'misreading',tamil:'தவறாகப் படி',example:'I misread the address.',exampleTamil:'நான் முகவரியைத் தவறாகப் படித்தேன்.'},
  {v1:'mistake',v2:'mistook',v3:'mistaken',ing:'mistaking',tamil:'தவறாக நினை',example:'I mistook him for his brother.',exampleTamil:'நான் அவரை அவரது சகோதரர் என்று தவறாக நினைத்தேன்.'},
  {v1:'misunderstand',v2:'misunderstood',v3:'misunderstood',ing:'misunderstanding',tamil:'தவறாகப் புரிந்துகொள்',example:'I misunderstood your question.',exampleTamil:'உங்கள் கேள்வியை நான் தவறாகப் புரிந்துகொண்டேன்.'},
  {v1:'outbid',v2:'outbid',v3:'outbid',ing:'outbidding',tamil:'அதிக ஏலம் கேள்',example:'She outbid the other buyers.',exampleTamil:'அவள் மற்ற வாங்குபவர்களை விட அதிக ஏலம் கேட்டாள்.'},
  {v1:'outdo',v2:'outdid',v3:'outdone',ing:'outdoing',tamil:'மிஞ்சி செய்',example:'He outdid himself this time.',exampleTamil:'இந்த முறை அவர் தன்னையே மிஞ்சினார்.'},
  {v1:'outdraw',v2:'outdrew',v3:'outdrawn',ing:'outdrawing',tamil:'அதிகம் ஈர்த்து / வரைய',example:'The event outdrew last year’s crowd.',exampleTamil:'அந்த நிகழ்ச்சி கடந்த ஆண்டை விட அதிக மக்களை ஈர்த்தது.'},
  {v1:'outdrink',v2:'outdrank',v3:'outdrunk',ing:'outdrinking',tamil:'அதிகமாகக் குடி',example:'He outdrank his rival.',exampleTamil:'அவர் தனது போட்டியாளரை விட அதிகமாகக் குடித்தார்.'},
  {v1:'outdrive',v2:'outdrove',v3:'outdriven',ing:'outdriving',tamil:'ஓட்டுவதில் மிஞ்சு',example:'She outdrove the other drivers.',exampleTamil:'அவள் மற்ற ஓட்டுநர்களை விட சிறப்பாக ஓட்டினாள்.'},
  {v1:'outfight',v2:'outfought',v3:'outfought',ing:'outfighting',tamil:'சண்டையில் வெல்',example:'The smaller team outfought its rivals.',exampleTamil:'சிறிய அணி தனது போட்டியாளர்களைச் சண்டையில் வென்றது.'},
  {v1:'outfly',v2:'outflew',v3:'outflown',ing:'outflying',tamil:'வேகமாகப் பறந்து மிஞ்சு',example:'The eagle outflew the other birds.',exampleTamil:'கழுகு மற்ற பறவைகளை விட வேகமாகப் பறந்தது.'},
  {v1:'outgrow',v2:'outgrew',v3:'outgrown',ing:'outgrowing',tamil:'வளர்ந்து பொருந்தாமல் போ',example:'Children outgrow their clothes quickly.',exampleTamil:'குழந்தைகளின் உடைகள் விரைவில் சிறியதாகிவிடும்.'},
  {v1:'outleap',v2:'outleapt/outleaped',v3:'outleapt/outleaped',ing:'outleaping',tamil:'தாண்டுவதில் மிஞ்சு',example:'The athlete outleapt his opponent.',exampleTamil:'விளையாட்டு வீரர் எதிராளியை விட உயரமாகத் தாண்டினார்.'},
  {v1:'outride',v2:'outrode',v3:'outridden',ing:'outriding',tamil:'சவாரியில் மிஞ்சு',example:'She outr rode the others.',exampleTamil:'அவள் மற்றவர்களை விட நன்றாகச் சவாரி செய்தாள்.'},
  {v1:'outrun',v2:'outran',v3:'outrun',ing:'outrunning',tamil:'ஓட்டத்தில் மிஞ்சு',example:'The boy outran his friends.',exampleTamil:'அந்தச் சிறுவன் நண்பர்களை விட வேகமாக ஓடினான்.'},
  {v1:'outsell',v2:'outsold',v3:'outsold',ing:'outselling',tamil:'அதிகமாக விற்பனை செய்',example:'This model outsold the old one.',exampleTamil:'இந்த மாடல் பழையதை விட அதிகமாக விற்றது.'},
  {v1:'outsit',v2:'outsat',v3:'outsat',ing:'outsitting',tamil:'நீண்ட நேரம் அமர்ந்து இரு',example:'She outsat everyone at the meeting.',exampleTamil:'கூட்டத்தில் அவள் அனைவரையும் விட நீண்ட நேரம் அமர்ந்திருந்தாள்.'},
  {v1:'outsleep',v2:'outslept',v3:'outslept',ing:'outsleeping',tamil:'அதிக நேரம் தூங்கு',example:'I outslept my brother.',exampleTamil:'நான் என் சகோதரனை விட அதிக நேரம் தூங்கினேன்.'},
  {v1:'outspend',v2:'outspent',v3:'outspent',ing:'outspending',tamil:'அதிகம் செலவு செய்',example:'They outspent their competitors.',exampleTamil:'அவர்கள் போட்டியாளர்களை விட அதிகம் செலவு செய்தனர்.'},
  {v1:'outswim',v2:'outswam',v3:'outswum',ing:'outswimming',tamil:'நீச்சலில் மிஞ்சு',example:'He outswam the other students.',exampleTamil:'அவர் மற்ற மாணவர்களை விட வேகமாக நீந்தினார்.'},
  {v1:'outthink',v2:'outthought',v3:'outthought',ing:'outthinking',tamil:'சிந்தனையில் மிஞ்சு',example:'She outthought her opponent.',exampleTamil:'அவள் எதிராளியை விட சிறப்பாகச் சிந்தித்தாள்.'},
  {v1:'outthrow',v2:'outthrew',v3:'outthrown',ing:'outthrowing',tamil:'வீசுவதில் மிஞ்சு',example:'The player outthrew the record holder.',exampleTamil:'வீரர் சாதனையாளரை விடத் தொலைவாக வீசினார்.'},
  {v1:'outwear',v2:'outwore',v3:'outworn',ing:'outwearing',tamil:'நீண்ட நாள் உழை',example:'This jacket outwore the cheaper one.',exampleTamil:'இந்த ஜாக்கெட் மலிவானதை விட நீண்ட நாள் நீடித்தது.'},
  {v1:'overbear',v2:'overbore',v3:'overborne',ing:'overbearing',tamil:'அடக்கி ஆளு',example:'His authority overbore their objections.',exampleTamil:'அவரது அதிகாரம் அவர்களின் எதிர்ப்புகளை அடக்கியது.'},
  {v1:'overbid',v2:'overbid',v3:'overbid',ing:'overbidding',tamil:'அதிக விலை ஏலம் கேள்',example:'They overbid for the property.',exampleTamil:'அவர்கள் அந்தச் சொத்துக்கு மிக அதிகமாக ஏலம் கேட்டனர்.'},
  {v1:'overbuild',v2:'overbuilt',v3:'overbuilt',ing:'overbuilding',tamil:'அதிகமாகக் கட்டு',example:'The company overbuilt its new factory.',exampleTamil:'நிறுவனம் புதிய தொழிற்சாலையைத் தேவைக்கு அதிகமாகக் கட்டியது.'},
  {v1:'overcast',v2:'overcast',v3:'overcast',ing:'overcasting',tamil:'மேகமூட்டு',example:'Clouds overcast the sky.',exampleTamil:'மேகங்கள் வானத்தை மூடின.'},
  {v1:'overcome',v2:'overcame',v3:'overcome',ing:'overcoming',tamil:'வென்று கடந்து செல்',example:'She overcame her fear.',exampleTamil:'அவள் தனது பயத்தை வென்றாள்.'},
  {v1:'overdo',v2:'overdid',v3:'overdone',ing:'overdoing',tamil:'அளவுக்கு மீறிச் செய்',example:'Do not overdo the exercise.',exampleTamil:'உடற்பயிற்சியை அளவுக்கு மீறிச் செய்யாதீர்கள்.'},
  {v1:'overdraw',v2:'overdrew',v3:'overdrawn',ing:'overdrawing',tamil:'கணக்கில் அதிகம் எடு',example:'He overdraw his bank account.',exampleTamil:'அவர் வங்கிக் கணக்கில் இருப்பதை விட அதிகம் எடுத்தார்.'},
  {v1:'overeat',v2:'overate',v3:'overeaten',ing:'overeating',tamil:'அதிகமாகச் சாப்பிடு',example:'I overate at the party.',exampleTamil:'விருந்தில் நான் அதிகமாகச் சாப்பிட்டேன்.'},
  {v1:'overfeed',v2:'overfed',v3:'overfed',ing:'overfeeding',tamil:'அதிகமாக உணவளி',example:'Do not overfeed the fish.',exampleTamil:'மீன்களுக்கு அதிகமாக உணவளிக்காதீர்கள்.'},
  {v1:'overfly',v2:'overflew',v3:'overflown',ing:'overflying',tamil:'மேலே பறந்து செல்',example:'The plane overflew the island.',exampleTamil:'விமானம் தீவின் மேலே பறந்து சென்றது.'},
  {v1:'overhang',v2:'overhung',v3:'overhung',ing:'overhanging',tamil:'மேலே தொங்கியிரு',example:'A branch overhung the path.',exampleTamil:'ஒரு கிளை பாதையின் மேலே தொங்கியது.'},
  {v1:'overhear',v2:'overheard',v3:'overheard',ing:'overhearing',tamil:'தற்செயலாகக் கேள்',example:'I overheard their conversation.',exampleTamil:'அவர்களின் உரையாடலை நான் தற்செயலாகக் கேட்டேன்.'},
  {v1:'overlay',v2:'overlaid',v3:'overlaid',ing:'overlaying',tamil:'மேல் அடுக்கு போடு',example:'They overlaid the floor with wood.',exampleTamil:'அவர்கள் தரையின் மேல் மரத்தால் அடுக்கு அமைத்தனர்.'},
  {v1:'overpay',v2:'overpaid',v3:'overpaid',ing:'overpaying',tamil:'அதிகமாகப் பணம் செலுத்து',example:'I overpaid for the ticket.',exampleTamil:'நான் நுழைவுச்சீட்டுக்கு அதிகமாகப் பணம் செலுத்தினேன்.'},
  {v1:'override',v2:'overrode',v3:'overridden',ing:'overriding',tamil:'மீறிச் செயல் / ரத்து செய்',example:'The manager overrode the decision.',exampleTamil:'மேலாளர் அந்த முடிவை மாற்றினார்.'},
  {v1:'overrun',v2:'overran',v3:'overrun',ing:'overrunning',tamil:'ஆக்கிரமி / நிரம்பி வழி',example:' weeds overran the garden.',exampleTamil:'களைகள் தோட்டம் முழுவதும் பரவின.'},
  {v1:'oversee',v2:'oversaw',v3:'overseen',ing:'overseeing',tamil:'மேற்பார்வை செய்',example:'She oversaw the project.',exampleTamil:'அவள் திட்டத்தை மேற்பார்வை செய்தாள்.'},
  {v1:'oversell',v2:'oversold',v3:'oversold',ing:'overselling',tamil:'மிகைப்படுத்தி விற்பனை செய்',example:'The shop oversold the product.',exampleTamil:'கடை அந்தப் பொருளை மிகைப்படுத்தி விற்றது.'},
  {v1:'overshoot',v2:'overshot',v3:'overshot',ing:'overshooting',tamil:'இலக்கைத் தாண்டிச் செல்',example:'The car overshot the turning.',exampleTamil:'கார் திருப்பத்தைத் தாண்டிச் சென்றது.'},
  {v1:'oversleep',v2:'overslept',v3:'overslept',ing:'oversleeping',tamil:'அதிக நேரம் தூங்கி விடு',example:'I overslept this morning.',exampleTamil:'இன்று காலை நான் அதிக நேரம் தூங்கிவிட்டேன்.'},
  {v1:'overspend',v2:'overspent',v3:'overspent',ing:'overspending',tamil:'அதிகம் செலவு செய்',example:'We overspent on the holiday.',exampleTamil:'விடுமுறையில் நாங்கள் அதிகம் செலவு செய்தோம்.'},
  {v1:'overspill',v2:'overspilt/overspilled',v3:'overspilt/overspilled',ing:'overspilling',tamil:'நிரம்பி வழி',example:'Water overspilt from the tank.',exampleTamil:'தொட்டியிலிருந்து தண்ணீர் நிரம்பி வழிந்தது.'},
  {v1:'overtake',v2:'overtook',v3:'overtaken',ing:'overtaking',tamil:'முந்திச் செல்',example:'The bus overtook the car.',exampleTamil:'பேருந்து காரை முந்திச் சென்றது.'},
  {v1:'overthrow',v2:'overthrew',v3:'overthrown',ing:'overthrowing',tamil:'கவிழ்த்து வீழ்த்து',example:'The people overthrew the ruler.',exampleTamil:'மக்கள் ஆட்சியாளரைப் பதவியிலிருந்து வீழ்த்தினர்.'},
  {v1:'overwind',v2:'overwound',v3:'overwound',ing:'overwinding',tamil:'அதிகமாகச் சுருக்கு',example:'He overwound the clock.',exampleTamil:'அவர் கடிகாரத்தை அளவுக்கு அதிகமாகச் சுருக்கினார்.'},
  {v1:'overwrite',v2:'overwrote',v3:'overwritten',ing:'overwriting',tamil:'மேலெழுதி மாற்று',example:'The file overwrote the old data.',exampleTamil:'கோப்பு பழைய தரவை மேலெழுதி மாற்றியது.'},
  {v1:'redo',v2:'redid',v3:'redone',ing:'redoing',tamil:'மீண்டும் செய்',example:'I redid the exercise.',exampleTamil:'நான் பயிற்சியை மீண்டும் செய்தேன்.'},
  {v1:'rebuild',v2:'rebuilt',v3:'rebuilt',ing:'rebuilding',tamil:'மீண்டும் கட்டு',example:'They rebuilt the bridge.',exampleTamil:'அவர்கள் பாலத்தை மீண்டும் கட்டினார்கள்.'},
  {v1:'recast',v2:'recast',v3:'recast',ing:'recasting',tamil:'மீண்டும் வடிவமை',example:'The team recast the plan.',exampleTamil:'குழு திட்டத்தை மறுவடிவமைத்தது.'},
  {v1:'remake',v2:'remade',v3:'remade',ing:'remaking',tamil:'மீண்டும் உருவாக்கு',example:'They remade the old film.',exampleTamil:'அவர்கள் பழைய திரைப்படத்தை மீண்டும் உருவாக்கினர்.'},
  {v1:'repay',v2:'repaid',v3:'repaid',ing:'repaying',tamil:'திருப்பிச் செலுத்து',example:'I repaid the loan.',exampleTamil:'நான் கடனைத் திருப்பிச் செலுத்தினேன்.'},
  {v1:'reread',v2:'reread',v3:'reread',ing:'rereading',tamil:'மீண்டும் படி',example:'She reread the letter.',exampleTamil:'அவள் கடிதத்தை மீண்டும் படித்தாள்.'},
  {v1:'resell',v2:'resold',v3:'resold',ing:'reselling',tamil:'மறுவிற்பனை செய்',example:'He resold the bicycle.',exampleTamil:'அவர் மிதிவண்டியை மறுவிற்பனை செய்தார்.'},
  {v1:'reset',v2:'reset',v3:'reset',ing:'resetting',tamil:'மீட்டமை',example:'I reset the password.',exampleTamil:'நான் கடவுச்சொல்லை மீட்டமைத்தேன்.'},
  {v1:'retake',v2:'retook',v3:'retaken',ing:'retaking',tamil:'மீண்டும் எடு / தேர்வு எழுது',example:'She retook the exam.',exampleTamil:'அவள் தேர்வை மீண்டும் எழுதினாள்.'},
  {v1:'retell',v2:'retold',v3:'retold',ing:'retelling',tamil:'மீண்டும் சொல்',example:'He retold the story.',exampleTamil:'அவர் கதையை மீண்டும் சொன்னார்.'},
  {v1:'rewrite',v2:'rewrote',v3:'rewritten',ing:'rewriting',tamil:'மீண்டும் எழுது',example:'I rewrote the report.',exampleTamil:'நான் அறிக்கையை மீண்டும் எழுதினேன்.'},
  {v1:'underbid',v2:'underbid',v3:'underbid',ing:'underbidding',tamil:'குறைந்த ஏலம் கேள்',example:'The firm underbid its rivals.',exampleTamil:'நிறுவனம் போட்டியாளர்களை விடக் குறைந்த ஏலம் கேட்டது.'},
  {v1:'undercut',v2:'undercut',v3:'undercut',ing:'undercutting',tamil:'குறைந்த விலை கொடு / பலவீனப்படுத்து',example:'The shop undercut its competitors.',exampleTamil:'கடை போட்டியாளர்களை விடக் குறைந்த விலை வைத்தது.'},
  {v1:'underfeed',v2:'underfed',v3:'underfed',ing:'underfeeding',tamil:'போதிய உணவளிக்காதே',example:'The animals were underfed.',exampleTamil:'விலங்குகளுக்குப் போதிய உணவு அளிக்கப்படவில்லை.'},
  {v1:'undergo',v2:'underwent',v3:'undergone',ing:'undergoing',tamil:'அனுபவி / உட்படு',example:'He underwent training.',exampleTamil:'அவர் பயிற்சிக்கு உட்பட்டார்.'},
  {v1:'underlie',v2:'underlay',v3:'underlain',ing:'underlying',tamil:'அடிப்படையாக இரு',example:'Trust underlay their friendship.',exampleTamil:'அவர்களின் நட்புக்கு நம்பிக்கை அடிப்படையாக இருந்தது.'},
  {v1:'underpay',v2:'underpaid',v3:'underpaid',ing:'underpaying',tamil:'குறைவாகச் சம்பளம் கொடு',example:'The company underpaid its workers.',exampleTamil:'நிறுவனம் தொழிலாளர்களுக்கு குறைவாகச் சம்பளம் கொடுத்தது.'},
  {v1:'undersell',v2:'undersold',v3:'undersold',ing:'underselling',tamil:'குறைந்த விலைக்கு விற்',example:'They undersold the competition.',exampleTamil:'அவர்கள் போட்டியாளர்களை விடக் குறைந்த விலைக்கு விற்றனர்.'},
  {v1:'undershoot',v2:'undershot',v3:'undershot',ing:'undershooting',tamil:'இலக்கை அடையாமல் குறைவாகச் செல்',example:'The plane undershot the runway.',exampleTamil:'விமானம் ஓடுபாதையை அடைவதற்கு முன்பே தரையிறங்கியது.'},
  {v1:'undertake',v2:'undertook',v3:'undertaken',ing:'undertaking',tamil:'பொறுப்பேற்று செய்',example:'She undertook the work.',exampleTamil:'அவள் அந்தப் பணியைப் பொறுப்பேற்றாள்.'},
  {v1:'underwrite',v2:'underwrote',v3:'underwritten',ing:'underwriting',tamil:'நிதி உத்தரவாதம் அளி',example:'The bank underwrote the project.',exampleTamil:'வங்கி திட்டத்திற்கு நிதி உத்தரவாதம் அளித்தது.'},
  {v1:'undo',v2:'undid',v3:'undone',ing:'undoing',tamil:'செய்ததை மாற்று / அவிழ்',example:'You can undo the last change.',exampleTamil:'கடைசி மாற்றத்தை நீங்கள் ரத்து செய்யலாம்.'},
  {v1:'unfreeze',v2:'unfroze',v3:'unfrozen',ing:'unfreezing',tamil:'உறைந்ததை உருக்கு',example:'We unfroze the food.',exampleTamil:'நாங்கள் உறைந்த உணவை உருக வைத்தோம்.'},
  {v1:'unlearn',v2:'unlearnt/unlearned',v3:'unlearnt/unlearned',ing:'unlearning',tamil:'கற்றதை மறந்து விடு',example:'It is hard to unlearn a habit.',exampleTamil:'ஒரு பழக்கத்தைக் கைவிடுவது கடினம்.'},
  {v1:'unmake',v2:'unmade',v3:'unmade',ing:'unmaking',tamil:'உருவாக்கியதை அழி',example:'Time can unmake old plans.',exampleTamil:'காலம் பழைய திட்டங்களைச் சிதைக்கலாம்.'},
  {v1:'unwind',v2:'unwound',v3:'unwound',ing:'unwinding',tamil:'சுருளை அவிழ் / ஓய்வெடு',example:'I unwind by reading.',exampleTamil:'நான் படிப்பதன் மூலம் ஓய்வெடுக்கிறேன்.'},
  {v1:'uphold',v2:'upheld',v3:'upheld',ing:'upholding',tamil:'நிலைநிறுத்து',example:'The court upheld the decision.',exampleTamil:'நீதிமன்றம் அந்த முடிவை உறுதிப்படுத்தியது.'},
  {v1:'upset',v2:'upset',v3:'upset',ing:'upsetting',tamil:'வருத்தப்படுத்து / கவிழ்த்து விடு',example:'The news upset her.',exampleTamil:'அந்தச் செய்தி அவளை வருத்தப்படுத்தியது.'},
  {v1:'waylay',v2:'waylaid',v3:'waylaid',ing:'waylaying',tamil:'வழிமறி',example:'The travellers were waylaid.',exampleTamil:'பயணிகள் வழிமறிக்கப்பட்டனர்.'},
  {v1:'withhold',v2:'withheld',v3:'withheld',ing:'withholding',tamil:'தடுத்து வை',example:'They withheld the information.',exampleTamil:'அவர்கள் தகவலைத் தடுத்து வைத்தனர்.'},
  {v1:'withstand',v2:'withstood',v3:'withstood',ing:'withstanding',tamil:'தாங்கி நில்',example:'The bridge withstood the storm.',exampleTamil:'பாலம் புயலைத் தாங்கியது.'},
  {v1:'withdraw',v2:'withdrew',v3:'withdrawn',ing:'withdrawing',tamil:'திரும்பப் பெறு / விலகு',example:'She withdrew the money.',exampleTamil:'அவள் பணத்தை எடுத்தாள்.'},
  {v1:'wring',v2:'wrung',v3:'wrung',ing:'wringing',tamil:'பிழி',example:'He wrung the wet towel.',exampleTamil:'அவர் ஈரமான துணியைப் பிழிந்தார்.'},
  {v1:'befit',v2:'befitted/befit',v3:'befitted/befit',ing:'befitting',tamil:'பொருத்தமாக இரு',example:'The honour befits her.',exampleTamil:'அந்த கௌரவம் அவளுக்குப் பொருத்தமானது.'},
  {v1:'forgo',v2:'forwent',v3:'forgone',ing:'forgoing',tamil:'தவிர்த்து விடு',example:'I forwent dessert.',exampleTamil:'நான் இனிப்பைத் தவிர்த்தேன்.'},
  {v1:'forsake',v2:'forsook',v3:'forsaken',ing:'forsaking',tamil:'கைவிடு',example:'He forsook his old habits.',exampleTamil:'அவர் தனது பழைய பழக்கங்களைக் கைவிட்டார்.'},
  {v1:'gainsay',v2:'gainsaid',v3:'gainsaid',ing:'gainsaying',tamil:'மறுத்துக் கூறு',example:'No one could gainsay the facts.',exampleTamil:'உண்மைகளை யாராலும் மறுக்க முடியவில்லை.'},
  {v1:'inlay',v2:'inlaid',v3:'inlaid',ing:'inlaying',tamil:'உள் பதிப்பு செய்',example:'The craftsman inlaid the table.',exampleTamil:'கைவினைஞர் மேசையில் அலங்காரப் பதிப்பு செய்தார்.'},
  {v1:'input',v2:'input/inputted',v3:'input/inputted',ing:'inputting',tamil:'உள்ளீடு செய்',example:'She input the data.',exampleTamil:'அவள் தரவை உள்ளீடு செய்தாள்.'},
  {v1:'interbreed',v2:'interbred',v3:'interbred',ing:'interbreeding',tamil:'கலப்பினம் செய்',example:'The species interbred naturally.',exampleTamil:'அந்த இனங்கள் இயற்கையாகக் கலப்பினம் செய்தன.'},
  {v1:'interweave',v2:'interwove',v3:'interwoven',ing:'interweaving',tamil:'ஒன்றோடொன்று பின்னு',example:'The story interwove two lives.',exampleTamil:'அந்தக் கதை இரண்டு வாழ்க்கைகளைப் பின்னிப் பிணைத்தது.'},
  {v1:'overlie',v2:'overlay',v3:'overlain',ing:'overlying',tamil:'மேலே படர்ந்திரு',example:'A layer of snow overlies the road.',exampleTamil:'சாலையின் மேல் பனிப்படலம் படர்ந்துள்ளது.'},
  {v1:'prepay',v2:'prepaid',v3:'prepaid',ing:'prepaying',tamil:'முன்கூட்டியே பணம் செலுத்து',example:'We prepaid the hotel bill.',exampleTamil:'நாங்கள் ஹோட்டல் கட்டணத்தை முன்கூட்டியே செலுத்தினோம்.'},
  {v1:'proofread',v2:'proofread',v3:'proofread',ing:'proofreading',tamil:'பிழைதிருத்தம் செய்',example:'I proofread the document.',exampleTamil:'நான் ஆவணத்தைப் பிழைதிருத்தம் செய்தேன்.'},
  {v1:'rebind',v2:'rebound',v3:'rebound',ing:'rebinding',tamil:'மீண்டும் கட்டு',example:'The library rebound the book.',exampleTamil:'நூலகம் புத்தகத்தை மீண்டும் கட்டியது.'},
  {v1:'regrind',v2:'reground',v3:'reground',ing:'regrinding',tamil:'மீண்டும் அரை',example:'They reground the coffee beans.',exampleTamil:'அவர்கள் காபிக் கொட்டைகளை மீண்டும் அரைத்தனர்.'},
  {v1:'reknit',v2:'reknit',v3:'reknit',ing:'reknitting',tamil:'மீண்டும் பின்னு',example:'She reknit the loose sleeve.',exampleTamil:'அவள் தளர்ந்த கையை மீண்டும் பின்னினாள்.'},
  {v1:'relight',v2:'relit/relighted',v3:'relit/relighted',ing:'relighting',tamil:'மீண்டும் ஏற்று',example:'He relit the candle.',exampleTamil:'அவர் மெழுகுவர்த்தியை மீண்டும் ஏற்றினார்.'},
  {v1:'remit',v2:'remitted',v3:'remitted',ing:'remitting',tamil:'அனுப்பு / தள்ளுபடி செய்',example:'They remitted the payment.',exampleTamil:'அவர்கள் பணத்தை அனுப்பினர்.'},
  {v1:'rerun',v2:'reran',v3:'rerun',ing:'rerunning',tamil:'மீண்டும் ஓட்டு / ஒளிபரப்பு செய்',example:'The channel reran the programme.',exampleTamil:'தொலைக்காட்சி நிறுவனம் நிகழ்ச்சியை மீண்டும் ஒளிபரப்பியது.'},
  {v1:'resit',v2:'resat',v3:'resat',ing:'resitting',tamil:'மீண்டும் தேர்வு எழுது',example:'He resat the examination.',exampleTamil:'அவர் தேர்வை மீண்டும் எழுதினார்.'},
  {v1:'retread',v2:'retrod',v3:'retrodden',ing:'retreading',tamil:'மீண்டும் நடந்து செல்',example:'They retrod the same path.',exampleTamil:'அவர்கள் அதே பாதையில் மீண்டும் நடந்தனர்.'},
  {v1:'rewind',v2:'rewound',v3:'rewound',ing:'rewinding',tamil:'பின்னோக்கிச் சுருள்',example:'Please rewind the tape.',exampleTamil:'தயவுசெய்து நாடாவைப் பின்னோக்கிச் சுருட்டுங்கள்.'},
  {v1:'sight-read',v2:'sight-read',v3:'sight-read',ing:'sight-reading',tamil:'பார்த்தவுடன் வாசி',example:'She sight-read the music.',exampleTamil:'அவள் இசைக் குறிப்புகளைப் பார்த்தவுடன் வாசித்தாள்.'},
  {v1:'spoon-feed',v2:'spoon-fed',v3:'spoon-fed',ing:'spoon-feeding',tamil:'கரண்டியால் ஊட்டு',example:'He spoon-fed the child.',exampleTamil:'அவர் குழந்தைக்குக் கரண்டியால் ஊட்டினார்.'},
  {v1:'strew',v2:'strewed',v3:'strewn/strewed',ing:'strewing',tamil:'சிதறவிடு',example:'Leaves were strewn on the path.',exampleTamil:'பாதையில் இலைகள் சிதறிக் கிடந்தன.'},
  {v1:'sublet',v2:'sublet',v3:'sublet',ing:'subletting',tamil:'உள்வாடகைக்கு விடு',example:'They sublet the apartment.',exampleTamil:'அவர்கள் குடியிருப்பை உள்வாடகைக்கு விட்டனர்.'},
  {v1:'typeset',v2:'typeset',v3:'typeset',ing:'typesetting',tamil:'அச்சுக்கோப்பு அமை',example:'He typeset the page.',exampleTamil:'அவர் பக்கத்தை அச்சுக்கோப்பாக அமைத்தார்.'},
  {v1:'wed',v2:'wed/wedded',v3:'wed/wedded',ing:'wedding',tamil:'திருமணம் செய்',example:'They wed in the spring.',exampleTamil:'அவர்கள் வசந்த காலத்தில் திருமணம் செய்துகொண்டனர்.'},
  {v1:'weave',v2:'wove',v3:'woven',ing:'weaving',tamil:'நெய்',example:'She wove a basket.',exampleTamil:'அவள் ஒரு கூடையைப் பின்னினாள்.'},
  {v1:'wet',v2:'wet/wetted',v3:'wet/wetted',ing:'wetting',tamil:'ஈரப்படுத்து',example:'He wet the cloth.',exampleTamil:'அவர் துணியை ஈரப்படுத்தினார்.'},
  {v1:'shrive',v2:'shrove/shrived',v3:'shriven/shrived',ing:'shriving',tamil:'பாவமன்னிப்பு வழங்கு',example:'The priest shrived the visitor.',exampleTamil:'பாதிரியார் வந்தவருக்குப் பாவமன்னிப்பு வழங்கினார்.'},
  {v1:'smite',v2:'smote',v3:'smitten',ing:'smiting',tamil:'கடுமையாக அடி',example:'The hero smote the enemy.',exampleTamil:'வீரன் எதிரியை வலுவாகத் தாக்கினான்.'},
  {v1:'slay',v2:'slew',v3:'slain',ing:'slaying',tamil:'கொல்',example:'The knight slew the dragon.',exampleTamil:'வீரன் டிராகனை வெட்டிக் கொன்றான்.'},
  {v1:'slink',v2:'slunk',v3:'slunk',ing:'slinking',tamil:'மெதுவாக நழுவிச் செல்',example:'The cat slunk away.',exampleTamil:'பூனை மெதுவாக நழுவிச் சென்றது.'},
  {v1:'sling',v2:'slung',v3:'slung',ing:'slinging',tamil:'வீசி எறி',example:'He slung the bag over his shoulder.',exampleTamil:'அவர் பையைத் தோளில் போட்டுக்கொண்டார்.'},
  {v1:'stink',v2:'stank',v3:'stunk',ing:'stinking',tamil:'துர்நாற்றம் வீசு',example:'The rubbish stank.',exampleTamil:'குப்பை துர்நாற்றம் வீசியது.'},
  {v1:'stride',v2:'strode',v3:'stridden',ing:'striding',tamil:'நீண்ட அடியெடுத்து நட',example:'She strode into the room.',exampleTamil:'அவள் அறைக்குள் நீண்ட அடியெடுத்து வந்தாள்.'},
  {v1:'strive',v2:'strove/strived',v3:'striven/strived',ing:'striving',tamil:'முயற்சி செய்',example:'They strove to improve.',exampleTamil:'அவர்கள் முன்னேற முயன்றார்கள்.'},
  {v1:'thrive',v2:'throve/thrived',v3:'thriven/thrived',ing:'thriving',tamil:'செழித்து வளர்',example:'The business thrived.',exampleTamil:'வணிகம் செழித்து வளர்ந்தது.'},
  {v1:'tread',v2:'trod',v3:'trodden',ing:'treading',tamil:'மிதி / நட',example:'He trod carefully.',exampleTamil:'அவர் கவனமாக நடந்தார்.'},
  {v1:'wean',v2:'weaned',v3:'weaned',ing:'weaning',tamil:'பாலூட்டுவதை நிறுத்து',example:'They weaned the baby.',exampleTamil:'அவர்கள் குழந்தைக்குப் பாலூட்டுவதை நிறுத்தினர்.'},
  {v1:'sweat',v2:'sweat/sweated',v3:'sweat/sweated',ing:'sweating',tamil:'வியர்வை சிந்து',example:'He sweat in the heat.',exampleTamil:'வெயிலில் அவர் வியர்த்தார்.'},
  {v1:'shave',v2:'shaved',v3:'shaved/shaven',ing:'shaving',tamil:'சவரம் செய்',example:'He shaved before work.',exampleTamil:'வேலைக்குச் செல்லும் முன் அவர் சவரம் செய்தார்.'},
  {v1:'shear',v2:'sheared',v3:'shorn/sheared',ing:'shearing',tamil:'கத்தரித்து வெட்டு',example:'They sheared the sheep.',exampleTamil:'அவர்கள் ஆட்டின் ரோமத்தை வெட்டினர்.'},
  {v1:'saw',v2:'sawed',v3:'sawn/sawed',ing:'sawing',tamil:'அறுத்து வெட்டு',example:'He sawed the wood.',exampleTamil:'அவர் மரத்தை அறுத்தார்.'},
  {v1:'sew',v2:'sewed',v3:'sewn/sewed',ing:'sewing',tamil:'தை',example:'She sewed a button.',exampleTamil:'அவள் ஒரு பொத்தானைத் தைத்தாள்.'},
  {v1:'sow',v2:'sowed',v3:'sown/sowed',ing:'sowing',tamil:'விதை விதை',example:'They sowed the seeds.',exampleTamil:'அவர்கள் விதைகளை விதைத்தனர்.'},
  {v1:'shrink',v2:'shrank/shrunk',v3:'shrunk/shrunken',ing:'shrinking',tamil:'சுருங்கு',example:'The shirt shrank in hot water.',exampleTamil:'சட்டை வெந்நீரில் சுருங்கியது.'},
  {v1:'spring',v2:'sprang/sprung',v3:'sprung',ing:'springing',tamil:'துள்ளி எழு',example:'The cat sprang onto the chair.',exampleTamil:'பூனை நாற்காலியின் மீது துள்ளிக் குதித்தது.'},
  {v1:'swear',v2:'swore',v3:'sworn',ing:'swearing',tamil:'சத்தியம் செய்',example:'He swore to tell the truth.',exampleTamil:'உண்மையைச் சொல்வதாக அவர் சத்தியம் செய்தார்.'},
  {v1:'sweep',v2:'swept',v3:'swept',ing:'sweeping',tamil:'பெருக்கு',example:'She swept the floor.',exampleTamil:'அவள் தரையைப் பெருக்கினாள்.'},
  {v1:'swing',v2:'swung',v3:'swung',ing:'swinging',tamil:'ஊசலாடு',example:'The child swung on the swing.',exampleTamil:'குழந்தை ஊஞ்சலில் ஆடியது.'},
  {v1:'thrust',v2:'thrust',v3:'thrust',ing:'thrusting',tamil:'வலுவாகத் தள்ளு',example:'He thrust the door open.',exampleTamil:'அவர் கதவை வலுவாகத் தள்ளித் திறந்தார்.'},
  {v1:'weep',v2:'wept',v3:'wept',ing:'weeping',tamil:'அழு',example:'The child wept quietly.',exampleTamil:'குழந்தை அமைதியாக அழுதது.'},
  {v1:'wind',v2:'wound',v3:'wound',ing:'winding',tamil:'சுற்று / சுருள்',example:'She wound the thread around the spool.',exampleTamil:'அவள் நூலை உருளையைச் சுற்றிச் சுருட்டினாள்.'},
  {v1:'grind',v2:'ground',v3:'ground',ing:'grinding',tamil:'அரை',example:'He ground the spices.',exampleTamil:'அவர் மசாலாப் பொருட்களை அரைத்தார்.'},
  {v1:'leap',v2:'leapt/leaped',v3:'leapt/leaped',ing:'leaping',tamil:'தாவு',example:'The dog leapt over the fence.',exampleTamil:'நாய் வேலியைத் தாண்டித் தாவியது.'}
].map(v => ({...v, v1:v.v1.trim()}));

@Component({
  selector: 'app-irregular-verbs', standalone: true, imports: [CommonModule, FormsModule],
  template: `
    <section class="wrap">
      <header class="hero"><span class="eyebrow">VERB FORMS · தமிழ் MEANING</span><h1>Irregular Verb Practice</h1><p>Search Base Form, Past Simple, Past Participle, -ing form or Tamil meaning. Learn the forms and practise one question at a time.</p><div class="stats"><span><b>{{ verbs.length }}</b> verb entries</span><span><b>{{ filtered().length }}</b> search results</span></div></header>
      <div class="search-card"><label for="verb-search">Search verbs</label><input id="verb-search" [ngModel]="search()" (ngModelChange)="search.set($event)" placeholder="Example: go, went, gone, going, போ" autocomplete="off"><small>Search by any verb form or Tamil meaning.</small></div>
      <nav class="tabs"><button type="button" [class.active]="mode()==='table'" (click)="mode.set('table')">Verb table</button><button type="button" [class.active]="mode()==='practice'" (click)="mode.set('practice')">Practice now</button></nav>
      @if (mode()==='table') {
        <div class="table-wrap"><table><thead><tr><th>Base Form</th><th>Past Simple</th><th>Past Participle</th><th>Present Participle (-ing)</th><th>Tamil Meaning</th></tr></thead><tbody>
          @for (v of filtered(); track v.v1) { <tr><td><b>{{v.v1}}</b></td><td>{{v.v2}}</td><td>{{v.v3}}</td><td>{{v.ing}}</td><td>{{v.tamil}}</td></tr> }
        </tbody></table>
        @if (!filtered().length) { <p class="empty">No matching verb. Try another spelling or Tamil meaning.</p> }
        </div>
      } @else {
        <article class="practice-card">
          @if (question()) {
            <div class="practice-head"><span class="level">{{ questionTypeLabel() }}</span><span class="counter">{{ practiceIndex()+1 }} / {{ filtered().length }}</span></div>
            <p class="instruction">{{ questionPrompt() }}</p>
            <h2>{{ question().v1 }} <span class="arrow">→</span> {{ askedForm() }}</h2>
            <p class="tamil-hint">Tamil: {{ question().tamil }}</p>
            <label for="answer">Your answer</label><input id="answer" [ngModel]="answer()" (ngModelChange)="answer.set($event)" (keyup.enter)="checkAnswer()" placeholder="Type the correct verb form" autocomplete="off">
            <div class="actions"><button type="button" (click)="checkAnswer()">Check answer</button><button type="button" class="secondary" (click)="reveal()">Show answer</button><button type="button" class="next" (click)="nextQuestion()">Next →</button></div>
            @if (feedback()) { <div class="feedback" [class.correct]="isCorrect()"><b>{{ feedback() }}</b><p>Correct form: {{ correctAnswer() }}</p><small>{{ question().example }} — {{ question().exampleTamil }}</small></div> }
          } @else { <p class="empty">No verbs match your search. Clear the search to practise all verbs.</p> }
        </article>
      }
    </section>
  `,
  styles: [`
    :host{display:block;color:var(--text)}.wrap{max-width:1000px;margin:0 auto}.hero{padding:10px 2px 18px}.eyebrow{font-size:.75rem;letter-spacing:.12em;font-weight:800;color:var(--primary)}h1{font-size:clamp(1.7rem,5vw,2.25rem);margin:6px 0}.hero p,.search-card small{color:var(--muted);line-height:1.55}.stats{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}.stats span{background:var(--primary-soft);color:var(--primary-dark);border-radius:12px;padding:8px 12px;font-size:.88rem}.search-card,.practice-card{background:#fff;border:1px solid var(--border);border-radius:16px;padding:14px;margin-bottom:14px}.search-card label,.practice-card label{display:block;font-weight:700;margin-bottom:8px}.search-card input,.practice-card input{width:100%;box-sizing:border-box;border:1px solid var(--border);border-radius:12px;padding:12px;font:inherit;margin-bottom:7px}.search-card small{display:block}.tabs{display:flex;gap:8px;margin:14px 0}.tabs button,.actions button{border:0;border-radius:12px;padding:11px 15px;background:var(--primary-soft);color:var(--primary-dark);font-weight:700}.tabs button.active,.actions button{background:var(--primary);color:white}.table-wrap{overflow:auto;background:#fff;border:1px solid var(--border);border-radius:16px}table{width:100%;border-collapse:collapse;min-width:650px}th,td{text-align:left;padding:12px 14px;border-bottom:1px solid var(--border)}th{background:var(--primary-soft);color:var(--primary-dark);font-size:.85rem;position:sticky;top:0}tbody tr:last-child td{border-bottom:0}tbody tr:hover{background:#faf8ff}.practice-card{padding:clamp(16px,4vw,24px);box-shadow:0 8px 24px rgba(60,35,100,.06)}.practice-head{display:flex;justify-content:space-between}.level{background:var(--primary-soft);color:var(--primary-dark);padding:5px 10px;border-radius:20px;font-size:.78rem;font-weight:700}.counter{color:var(--muted);font-weight:700}.instruction{color:var(--muted);margin:24px 0 8px}.practice-card h2{font-size:clamp(1.4rem,4vw,1.9rem);margin:8px 0}.arrow{color:var(--primary)}.tamil-hint{color:var(--muted);font-weight:600}.actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.actions .secondary{background:var(--primary-soft);color:var(--primary-dark)}.actions .next{margin-left:auto;background:#ece8f5;color:#39246c}.feedback{margin-top:16px;padding:14px;border-radius:12px;background:#fff4e5;color:#784b00}.feedback.correct{background:#eaf8ef;color:#17683b}.feedback p{margin:6px 0}.feedback small{line-height:1.5}.empty{padding:18px;color:var(--muted);text-align:center}@media(max-width:600px){th,td{padding:10px;font-size:.88rem}.actions button{flex:1}.actions .next{margin-left:0}}
  `]
})
export class IrregularVerbsComponent {
  readonly verbs = VERBS;
  readonly search = signal('');
  readonly mode = signal<'table'|'practice'>('practice');
  readonly practiceIndex = signal(0);
  readonly answer = signal('');
  readonly feedback = signal('');
  readonly isCorrect = signal(false);
  readonly questionType = signal<'v2'|'v3'|'ing'>('v2');
  readonly filtered = computed(() => {
    const q = this.search().trim().toLocaleLowerCase();
    if (!q) return this.verbs;
    return this.verbs.filter(v => [v.v1,v.v2,v.v3,v.ing,v.tamil].some(x => x.toLocaleLowerCase().includes(q)));
  });
  readonly question = computed(() => this.filtered()[this.practiceIndex()] ?? null);
  readonly askedForm = computed(() => ({v2:'Past Simple',v3:'Past Participle',ing:'Present Participle (-ing)'}[this.questionType()]));
  readonly questionTypeLabel = computed(() => 'Fill in ' + this.askedForm());
  readonly questionPrompt = computed(() => 'Type the ' + this.askedForm() + ' form of this verb.');
  readonly correctAnswer = computed(() => this.question()?.[this.questionType()] ?? '');
  checkAnswer(): void {
    if (!this.question()) return;
    const expected = this.correctAnswer().toLocaleLowerCase().split('/').map(x=>x.trim());
    const actual = this.answer().trim().toLocaleLowerCase();
    this.isCorrect.set(expected.includes(actual));
    this.feedback.set(this.isCorrect() ? 'Correct! Well done.' : 'Not quite. Check the correct form below.');
  }
  reveal(): void { if (this.question()) { this.answer.set(this.correctAnswer()); this.isCorrect.set(false); this.feedback.set('Here is the answer. Read the example aloud.'); } }
  nextQuestion(): void {
    const total = this.filtered().length;
    if (!total) return;
    this.practiceIndex.set((this.practiceIndex()+1)%total);
    this.answer.set(''); this.feedback.set('');
    const order: Array<'v2'|'v3'|'ing'> = ['v2','v3','ing'];
    this.questionType.set(order[(order.indexOf(this.questionType())+1)%order.length]);
  }
}
