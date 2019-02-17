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

        vk.alfa1 = Pairing.G1Point(18896431438513491516249979351330777206446770559487802971266131106413126935084, 10436027922336146068880052722802013436418296277582626425695182400863147749634);
        vk.beta2 = Pairing.G2Point([4664767592570061371500964059736065853163541009388214184693389229404427015194,6050380001224671454569559277303481242028872652620285171673163124049712967117], [20670500168471974334502355235929101299925984991254355247044891969898632819540,8015527828876864143367091557683124187924431022762433361274552554699304827312]);
        vk.gamma2 = Pairing.G2Point([10642339211315427764465190479044520677249559225112575532792360080553081262577,13767180889267410631140270791775474774241070377224456362790774977006480622016], [12232659203749131091813174428225832966222255818229277896109457272802602993153,403814609865568568063858761728014143739097011230170337554808773998294351385]);
        vk.delta2 = Pairing.G2Point([15171022643355275450602103941170501584131092649257787146664113630813410872550,19064809980530110844055920177243800835806838373439306501211627896390199567816], [8259600121129944523091049455376307761654557718353968024558800023916700895579,15949912158152489349712319775255590222805851685333466861577614625257065750173]);
        vk.IC = new Pairing.G1Point[](4);
        vk.IC[0] = Pairing.G1Point(7704381656700035256681927457349330553485393661408765810700324506660702157263, 3965690270424962989334999465259385424269338287670543234964112123856309690718);
        vk.IC[1] = Pairing.G1Point(20428646969602118352877976188683031338991832880735061244879188225102951382896, 8376237668749221648262601045769154452892672623942003729310847898528814731412);
        vk.IC[2] = Pairing.G1Point(19593630896555079070149870806203107799601354949108481374389812468100428687201, 862955661113510284511414718538666620562541839275705383777120500276385071435);
        vk.IC[3] = Pairing.G1Point(11569735809864777701603786659636909435984869771562847435703447532998810496253, 15249816077643571703511779233841763711539438568296892898373306710145117023458);
    }

    function verifyingTransactionKey() pure internal returns (VerifyingKey memory vk) {

        vk.alfa1 = Pairing.G1Point(12762532903382999466431475223345919420016747492605185595245372361812287658134, 13616796450777280423972655838927764071461539812225905304874318873047442725237);
        vk.beta2 = Pairing.G2Point([18547682089419927105942982927853052594192619440481380728969522226874334712768,9949200694867162211325031370427487385993245165126755641122811902297140397983], [7688603280160517598329445973908987763762540901405278275165776534531934914040,7639258570574511582476321559683236061722693611005595054794386206791502091772]);
        vk.gamma2 = Pairing.G2Point([15901823804810198000686072276060601595063029301051187761143924487890906229151,4999323227596157544349034922565288686973380252023030499049366688368590086416], [16464631199706794347990800136606617398672354793576708278235542296012925906296,7699627363001274550025827605198239042820563960451158131047203664530297911950]);
        vk.delta2 = Pairing.G2Point([4049490334775258343005738235431472886991236468890954579743448855649298942646,12302700183261798970912789968218898986763817660891237549015660630440040540626], [17836530216975447912344793760502799956310664276678448272285067054927276596756,12580094353223420793168888908794092998588389268403436776369053156231249302609]);
        vk.IC = new Pairing.G1Point[](16);
        vk.IC[0] = Pairing.G1Point(8736326720627153176976209485183547624885252995190374053049808897077220571367, 20948174463179351397279615700313985887914989694141307688264228069705106035095);
        vk.IC[1] = Pairing.G1Point(9935678084875324044026569804515816061051229882044386686029315409591035432174, 2325901733961214684224664522439746854562577280360385255450212808483606483305);
        vk.IC[2] = Pairing.G1Point(4349750717181020428099251659372988792909397754650224340750804398144573906197, 19691318034833913712751497525722390195024439703589023503914284235053063349963);
        vk.IC[3] = Pairing.G1Point(16568700147049178183297266225181020243495370526078387530326341912924281231819, 20506754725327718975132481030644686151299167754416590483290330487193227150371);
        vk.IC[4] = Pairing.G1Point(5611287222882984148035226500663263924000211794543627204439054887290611665098, 15012756440369231367413812260984976259148104792951217210227784215738377087692);
        vk.IC[5] = Pairing.G1Point(3781014289459894012950111887370025385365800983988581921089448950413887570126, 4666548748812173792085795952790217804611403381376562028029985563067911056755);
        vk.IC[6] = Pairing.G1Point(16149952746570076724980562277619242590894108670321993080982809401773780495997, 18890404919753211811367052324865811092339014364006652511345351643800098550273);
        vk.IC[7] = Pairing.G1Point(16758653826844637768691324542145607587872923034236038728239405495199562975830, 20499405518334834067366404028746949209789518326759460864817157071780592458252);
        vk.IC[8] = Pairing.G1Point(5175735931857611787968455745070737714652076875246156984117730928564313178449, 4882286285459507713720808842879086438879735395237533088365717700988308957452);
        vk.IC[9] = Pairing.G1Point(4840953741131022832936196117268226720215111810656894025048958592484965351442, 10081210436153548228238923075604569481734308974531480563466554219187474381247);
        vk.IC[10] = Pairing.G1Point(10174506077493044323883788829230643016793890754978941237202031535225373568819, 15502237405535921504148066188744593483718090966841764522906933010104344425047);
        vk.IC[11] = Pairing.G1Point(21726645198351651656965590147398908185518905048739561899232302209680884357665, 4542572497502065502474171078292545898065107321321387058404623599120390762671);
        vk.IC[12] = Pairing.G1Point(20752294628212008508785021294628989003142389632206882590800355015328560253834, 14381506112208093905973190438337044100551324742985630251343373146813184344474);
        vk.IC[13] = Pairing.G1Point(16025804274982408970508852595288872450271619506313967091057382722206722196122, 11438462766419743577117001750694041794651472371855734032723888339597406487578);
        vk.IC[14] = Pairing.G1Point(8464077288358072228304126548238535776673370897241109914149907429493352976648, 15101284967267392864964431768356959123294846089344028263036340421787407062018);
        vk.IC[15] = Pairing.G1Point(18218985243701602555494722318562245932829696930570781151693849190060220741958, 5754170891259738919880640548864905002845487617743645560402303300408396697762);
    }

    function verifyingWithdrawalKey() pure internal returns (VerifyingKey memory vk) {

        vk.alfa1 = Pairing.G1Point(19325972090974708086160714857672080416456467066310134157067575798997244905427, 11460632830680457640873231091667799312403575244816592873871950513868544645999);
        vk.beta2 = Pairing.G2Point([21106093458575674991029042260815989670513872464477958037026614487382623792071,12677613142618957689019521042685363609395326635849371851184339196266860284484], [8700482457015355597021750921963664909742442409131865679323701799897521110088,2035423690760184117562834596102924110373783039894918129817386362045414470128]);
        vk.gamma2 = Pairing.G2Point([868491969752072912134885554543939836073474326556815632811642514445111520210,17873037816256123272681053467617911227837129714090131372501275335508288468092], [10461113353152868826582054121823268845883185521503275157597974655319116271704,10221552358206522496070639481851961604538405137160646041285943857342565816620]);
        vk.delta2 = Pairing.G2Point([8134518885963217911848540502586212006346076711016298528217603687934019350032,20349896066826101094962228064923325758978288237818138049134085628821385181909], [13298174010259055139698283249074712688324753897899186286806515307012859425148,17948746589707053992807027229716855604881035827421103887654398353348998904647]);
        vk.IC = new Pairing.G1Point[](5);
        vk.IC[0] = Pairing.G1Point(11618444691901081221736451090184270530046702254618013059213207933233099377643, 957906384566321941722671245680472749191387669556249264231947261989603702782);
        vk.IC[1] = Pairing.G1Point(2754276828620726516259573003679181761679402689456235668083402007188911166553, 12712662117497913334995131009280323313768623498129531894722897136765190997714);
        vk.IC[2] = Pairing.G1Point(1575290550615233332333076380773307078109187683517859845176841008857497583306, 20565715025703058916633885440533950998898204882367002100094049303947204275132);
        vk.IC[3] = Pairing.G1Point(4711234654779488984186822171586013448160209577952523079508397271705693348934, 9271699305041048734979347848924800523081439979128351691812841111312944744846);
        vk.IC[4] = Pairing.G1Point(8076398919332480951519097728495656908598329960935274464534085222086470172109, 21568040917239462636888564939983724150031640822331283362367028655569930308342);
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
