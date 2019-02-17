//
// Copyright 2017 Christian Reitwiessner
// Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
// The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
pragma solidity >=0.5.2;
library Pairing {
    struct G1Point {
        uint X;
        uint Y;
    }
    // Encoding of field elements is: X[0] * z + X[1]
    struct G2Point {
        uint[2] X;
        uint[2] Y;
    }
    /// @return the generator of G1
    function P1() pure internal returns (G1Point memory) {
        return G1Point(1, 2);
    }
    /// @return the generator of G2
    function P2() pure internal returns (G2Point memory) {
        // Original code point
        return G2Point(
            [11559732032986387107991004021392285783925812861821192530917403151452391805634,
             10857046999023057135944570762232829481370756359578518086990519993285655852781],
            [4082367875863433681332203403145435568316851327593401208105741076214120093531,
             8495653923123431417604973247489272438418190587263600148770280649306958101930]
        );

/*
        // Changed by Jordi point
        return G2Point(
            [10857046999023057135944570762232829481370756359578518086990519993285655852781,
             11559732032986387107991004021392285783925812861821192530917403151452391805634],
            [8495653923123431417604973247489272438418190587263600148770280649306958101930,
             4082367875863433681332203403145435568316851327593401208105741076214120093531]
        );
*/
    }
    /// @return the negation of p, i.e. p.addition(p.negate()) should be zero.
    function negate(G1Point memory p) pure internal returns (G1Point memory) {
        // The prime q in the base field F_q for G1
        uint q = 21888242871839275222246405745257275088696311157297823662689037894645226208583;
        if (p.X == 0 && p.Y == 0)
            return G1Point(0, 0);
        return G1Point(p.X, q - (p.Y % q));
    }
    /// @return the sum of two points of G1
    function addition(G1Point memory p1, G1Point memory p2) view internal returns (G1Point memory r) {
        uint[4] memory input;
        input[0] = p1.X;
        input[1] = p1.Y;
        input[2] = p2.X;
        input[3] = p2.Y;
        bool success;
        assembly {
            success := staticcall(sub(gas, 2000), 6, input, 0xc0, r, 0x60)
            // Use "invalid" to make gas estimation work
            switch success case 0 { invalid() }
        }
        require(success);
    }
    /// @return the product of a point on G1 and a scalar, i.e.
    /// p == p.scalar_mul(1) and p.addition(p) == p.scalar_mul(2) for all points p.
    function scalar_mul(G1Point memory p, uint s) view internal returns (G1Point memory r) {
        uint[3] memory input;
        input[0] = p.X;
        input[1] = p.Y;
        input[2] = s;
        bool success;
        assembly {
            success := staticcall(sub(gas, 2000), 7, input, 0x80, r, 0x60)
            // Use "invalid" to make gas estimation work
            switch success case 0 { invalid() }
        }
        require (success);
    }
    /// @return the result of computing the pairing check
    /// e(p1[0], p2[0]) *  .... * e(p1[n], p2[n]) == 1
    /// For example pairing([P1(), P1().negate()], [P2(), P2()]) should
    /// return true.
    function pairing(G1Point[] memory p1, G2Point[] memory p2) view internal returns (bool) {
        require(p1.length == p2.length);
        uint elements = p1.length;
        uint inputSize = elements * 6;
        uint[] memory input = new uint[](inputSize);
        for (uint i = 0; i < elements; i++)
        {
            input[i * 6 + 0] = p1[i].X;
            input[i * 6 + 1] = p1[i].Y;
            input[i * 6 + 2] = p2[i].X[0];
            input[i * 6 + 3] = p2[i].X[1];
            input[i * 6 + 4] = p2[i].Y[0];
            input[i * 6 + 5] = p2[i].Y[1];
        }
        uint[1] memory out;
        bool success;
        assembly {
            success := staticcall(sub(gas, 2000), 8, add(input, 0x20), mul(inputSize, 0x20), out, 0x20)
            // Use "invalid" to make gas estimation work
            switch success case 0 { invalid() }
        }
        require(success);
        return out[0] != 0;
    }
    /// Convenience method for a pairing check for two pairs.
    function pairingProd2(G1Point memory a1, G2Point memory a2, G1Point memory b1, G2Point memory b2) view internal returns (bool) {
        G1Point[] memory p1 = new G1Point[](2);
        G2Point[] memory p2 = new G2Point[](2);
        p1[0] = a1;
        p1[1] = b1;
        p2[0] = a2;
        p2[1] = b2;
        return pairing(p1, p2);
    }
    /// Convenience method for a pairing check for three pairs.
    function pairingProd3(
            G1Point memory a1, G2Point memory a2,
            G1Point memory b1, G2Point memory b2,
            G1Point memory c1, G2Point memory c2
    ) view internal returns (bool) {
        G1Point[] memory p1 = new G1Point[](3);
        G2Point[] memory p2 = new G2Point[](3);
        p1[0] = a1;
        p1[1] = b1;
        p1[2] = c1;
        p2[0] = a2;
        p2[1] = b2;
        p2[2] = c2;
        return pairing(p1, p2);
    }
    /// Convenience method for a pairing check for four pairs.
    function pairingProd4(
            G1Point memory a1, G2Point memory a2,
            G1Point memory b1, G2Point memory b2,
            G1Point memory c1, G2Point memory c2,
            G1Point memory d1, G2Point memory d2
    ) view internal returns (bool) {
        G1Point[] memory p1 = new G1Point[](4);
        G2Point[] memory p2 = new G2Point[](4);
        p1[0] = a1;
        p1[1] = b1;
        p1[2] = c1;
        p1[3] = d1;
        p2[0] = a2;
        p2[1] = b2;
        p2[2] = c2;
        p2[3] = d2;
        return pairing(p1, p2);
    }
}
contract Verifier {
    using Pairing for *;
    struct VerifyingKey {
        Pairing.G1Point alfa1;
        Pairing.G2Point beta2;
        Pairing.G2Point gamma2;
        Pairing.G2Point delta2;
        Pairing.G1Point[] IC;
    }
    struct Proof {
        Pairing.G1Point A;
        Pairing.G2Point B;
        Pairing.G1Point C;
    }
    function verifyingDepositKey() pure internal returns (VerifyingKey memory vk) {

        vk.alfa1 = Pairing.G1Point(17124737387485702229028786188930218914471557656182274021881821170784688351263,11643212712981323636382885545595401439541779544616436213605186338471347836867);
        vk.beta2 = Pairing.G2Point([12257532022036449353168654984947235192727543699461251634453267370808969498602,10984284406735796990712152358247927712077153977426537774687473548647623519331], [8616036357477762982400569239564869887444529909239602674767990105241038423349,5313517540086871550177247298859782938293726658817584915189433851019886934666]);
        vk.gamma2 = Pairing.G2Point([8107070604602053498176854458112901796316561025110928617753334096754885429178,11125243626171851470776664197978231348387801030159948382118102246238415676915], [12177080675542040816949560105740586939686420014755817759967682950984852593749,21387293722968872950231760052714645010914760050683591200458248484432958968032]);
        vk.delta2 = Pairing.G2Point([8019941073747288084903442221349945384954624378943867593071072835101149016095,21013417065265277869113509854565411028712623615704923693798784126547948866424], [13347828092723943695993187262067889701491668652664856212999427715815967504705,17140386889913101400033983991990418673868277610139649731083662161638674907986]);
        vk.IC = new Pairing.G1Point[](4);
        vk.IC[0] = Pairing.G1Point(12671866874594492374730400045894684020626433554615581311737491683669878307908,5277190955629831889716265676402824525228007013309012937858902100535154420976);
        vk.IC[1] = Pairing.G1Point(8544200527576760789121462476638614456930478719636063393147403049652761854344,13805015513037580803454137400302175425486240472853084493174830571040177145572);
        vk.IC[2] = Pairing.G1Point(15918500014695993409527504417831801282937475758450624262569097555729110096261,9982163259549607755732497614611632192846378790708446211712109017972203930928);
        vk.IC[3] = Pairing.G1Point(14554831709722879825898983564744627877857151252698012757969054861117323353856,107934732720613487664739975054218365991351950815403051058092278176267356675);

    
    }

    function verifyingTransactionKey() pure internal returns (VerifyingKey memory vk) {

        vk.alfa1 = Pairing.G1Point(7842044764771488662699969251524169340893042806995758158701562006300877218010,10584968930979632320646321209284673514334199753187717512341959068808994550613);
        vk.beta2 = Pairing.G2Point([19869008577695717611101054051096263158404211897186147175484597974818200328711,20254180739413712937772379978904580127355470458112405216523462103307654671829], [513354381963420091486321984942945737287118816496951526325159103077102172291,13930313832394282185847608536915223372649635389597953666939401944792680354762]);
        vk.gamma2 = Pairing.G2Point([7086839715933874223982702176121897076138748760139929581383209516438298995354,7175701054038217929519501124430011540716729138463326827165253062537830829960], [14020745391103289264792440439287682630983506455887852961875578479960324848694,20928907111491915948953091294887029283056904588333814111812080588480068336573]);
        vk.delta2 = Pairing.G2Point([11823466808844917430872791410359101980125467964250762829023494319918483113037,138335958182034572011819944375631340113778853629416173945021036006813688382], [3802166263264475328121360535737216802088994421437426405146916838242969805824,14216845792007700790255446224482179780244492868206635849721654889082482428176]);
        vk.IC = new Pairing.G1Point[](16);
        vk.IC[0] = Pairing.G1Point(5967300819707578136895913678186587662750588139869698813136345728627358748465,17038017047692285637279412850600083782142878886995329485596663393369380380189);
        vk.IC[1] = Pairing.G1Point(18586356605095257475479816189444060576094906705701795575497672938661888961091,18384502906358973170969668856304878165190525007909334013411660701044560193779);
        vk.IC[2] = Pairing.G1Point(5601333196859749598633402602303231371785350470756044772081631407545985220516,7303312273921187506089738070239087031584661200671120945655412447256445576959);
        vk.IC[3] = Pairing.G1Point(21542644084668141957210473699139509727187959863077733640525578116814557050151,6399644230142722512419259206207224476491246003063845825901095235241455752851);
        vk.IC[4] = Pairing.G1Point(5782627850963632719034578861714319545896022083799113634481049003802241158125,1133534356384478324329803983874305814603197357131108535330502069116097650736);
        vk.IC[5] = Pairing.G1Point(16682773677021213802897445033646222643964600293897933826416704264289288245654,18889552168962351092074391836799156567346122728237704757527489058894768310215);
        vk.IC[6] = Pairing.G1Point(2960713435940096628927914158011236571409004608446779378819550774401641546969,11670957799599093842499886449181108597297362164566277863004837135731546081883);
        vk.IC[7] = Pairing.G1Point(4825101695464131349244847698284231743515598597017461346964611300756099282405,11761988456014792002439676755393968250537789494179417095911840189941662247234);
        vk.IC[8] = Pairing.G1Point(3241029381500273093631925483247364795431577252705999922768989433896396423407,20774045089761159980595534737951912404800997046286532186357560897108865420381);
        vk.IC[9] = Pairing.G1Point(12868432709950671794200105767344147546744961818882083350689051331573144446675,14447685300851373038322549000732505122464520757619256050060994189881746079843);
        vk.IC[10] = Pairing.G1Point(6819592094377648483582371950124822737249314056496101344254423095515478894595,15136847324350753067199020199855326422427205463337887966278402425023141302147);
        vk.IC[11] = Pairing.G1Point(6087810332273383160903464973218102021395567619935903971864681422920353513939,20398654677629870263123271683671076902039959616577034268786866991267246144769);
        vk.IC[12] = Pairing.G1Point(13989432297178987257529564955761528864323554067446585718222230819673274663890,3793855475545679427274308640416932717731722104986815831761716515957519048051);
        vk.IC[13] = Pairing.G1Point(16301467604387500558677030440600991347741059805170265840174702711467691047724,19991267982263525853797186925756820310284186375031307138117248803333974545673);
        vk.IC[14] = Pairing.G1Point(21851224814394618852216857443020092494798579037089542852496538635497629618484,801537813312896657815798290688528788410530998818650377235645223278014867835);
        vk.IC[15] = Pairing.G1Point(6727211926894672862835766083402840816766042869348466990421774574788403581345,17116136316452174679777242695175914512556771827321160526001078068263593744463);

    
    }

    function verifyingWithdrawalKey() pure internal returns (VerifyingKey memory vk) {

        vk.alfa1 = Pairing.G1Point(8447929484096695960993689591740702006145807273412490180925169554224675199862,1868377481350085683712163343498235223140241267462854791517714308555255829258);
        vk.beta2 = Pairing.G2Point([19229018056600045441777941997731897451784197985992425192063827246330251146461,17815306823617159346940100102841313186011241539897378461099435655595047277280], [14228344027550493381183664568813458681439865112845071562202282851249080016175,12205118287552555882253832669483007539534238865704043970518752271717397114600]);
        vk.gamma2 = Pairing.G2Point([7794304439195555996060866027316730125537257816016064263328313974217750150752,19998551806641019587317905833457752626825203525649418438279463669174986950096], [3312701395269554224091250675671237671539797575009018179597082927536403039069,5056944630965492095700145017499590832422010852303387523866462205331435840633]);
        vk.delta2 = Pairing.G2Point([9455454464767551865208997188077400147217704912992865511094123984196175406256,4077565647258399117689153010357651563464042488904452557037841242819611314038], [15659032573359846980884752159368202846941832141787595677651620610406282450562,20364866860691648009570422631365135082718710626284476466183817007492479310199]);
        vk.IC = new Pairing.G1Point[](5);
        vk.IC[0] = Pairing.G1Point(17788467003501325139866312615679692263079565480582831944003294222831411044813,11703456147586687189376081188782715339855080039024152559919661596845390338859);
        vk.IC[1] = Pairing.G1Point(19649489209252475657973043022640478750835341409713474469195892366733185305445,10092763527888019251391741862093177813664794170604931214582968903824808833553);
        vk.IC[2] = Pairing.G1Point(3034814566669005885517789413735516809670973266338978555506682022527225091520,13166535771274739870620726854728172451929004371172694000944722126528005656562);
        vk.IC[3] = Pairing.G1Point(15477339494651679579895411080099477645032187192588909440940446299741253343921,4074867551677792858869097128389269393009773739372113063445006529560181897610);
        vk.IC[4] = Pairing.G1Point(9982468603758098284452193594363312327590258546386478797280441766964215190948,12288770737363857000070088911416454758054525564000203522517096213198695904561);

    
    }

    function verify(uint[] memory input, Proof memory proof, VerifyingKey memory vk) view internal returns (uint) {
        require(input.length + 1 == vk.IC.length);
        // Compute the linear combination vk_x
        Pairing.G1Point memory vk_x = Pairing.G1Point(0, 0);
        for (uint i = 0; i < input.length; i++)
            vk_x = Pairing.addition(vk_x, Pairing.scalar_mul(vk.IC[i + 1], input[i]));
        vk_x = Pairing.addition(vk_x, vk.IC[0]);
        if (!Pairing.pairingProd4(
            Pairing.negate(proof.A), proof.B,
            vk.alfa1, vk.beta2,
            vk_x, vk.gamma2,
            proof.C, vk.delta2
        )) return 1;
        return 0;
    }

    function verifyDeposit(
            uint[2] memory a,
            uint[2][2] memory b,
            uint[2] memory c,
            uint[3] memory input
        ) view public returns (bool r) {
        Proof memory proof;
        proof.A = Pairing.G1Point(a[0], a[1]);
        proof.B = Pairing.G2Point([b[0][0], b[0][1]], [b[1][0], b[1][1]]);
        proof.C = Pairing.G1Point(c[0], c[1]);
        uint[] memory inputValues = new uint[](input.length);
        for(uint i = 0; i < input.length; i++){
            inputValues[i] = input[i];
        }
        if (verify(inputValues, proof, verifyingDepositKey()) == 0) {
            return true;
        } else {
            return false;
        }
    }


    function verifyTransaction(
            uint[2] memory a,
            uint[2][2] memory b,
            uint[2] memory c,
            uint[15] memory input
        ) view public returns (bool r) {
        Proof memory proof;
        proof.A = Pairing.G1Point(a[0], a[1]);
        proof.B = Pairing.G2Point([b[0][0], b[0][1]], [b[1][0], b[1][1]]);
        proof.C = Pairing.G1Point(c[0], c[1]);
        uint[] memory inputValues = new uint[](input.length);
        for(uint i = 0; i < input.length; i++){
            inputValues[i] = input[i];
        }
        if (verify(inputValues, proof, verifyingTransactionKey()) == 0) {
            return true;
        } else {
            return false;
        }
    }

    function verifyWithdrawal(
            uint[2] memory a,
            uint[2][2] memory b,
            uint[2] memory c,
            uint[4] memory input
        ) view public returns (bool r) {
        Proof memory proof;
        proof.A = Pairing.G1Point(a[0], a[1]);
        proof.B = Pairing.G2Point([b[0][0], b[0][1]], [b[1][0], b[1][1]]);
        proof.C = Pairing.G1Point(c[0], c[1]);
        uint[] memory inputValues = new uint[](input.length);
        for(uint i = 0; i < input.length; i++){
            inputValues[i] = input[i];
        }
        if (verify(inputValues, proof, verifyingWithdrawalKey()) == 0) {
            return true;
        } else {
            return false;
        }
    }
}
