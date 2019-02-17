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

        vk.alfa1 = Pairing.G1Point(148350160013641516516065394941017325869945323004954379684920804185393807751, 6777192247018640954943263298455924834028829503672188683224846399459539942827);
        vk.beta2 = Pairing.G2Point([8855928623051960240896239945031590750212896569454775588625105709883890321546,3950649338168012954992532160407061915324917009950812622207476682942984666803], [10363134207872820223032567101113647040964985484926645700270326617996036935056,8890408546858459219889650822610567051291826992757045036962364817981853236142]);
        vk.gamma2 = Pairing.G2Point([2820271232645360476018121431610815673304992092269947750802541413581472777933,18956512084891275246781833815350963761248013765743873162939612943084634539054], [11705923375182682109915031678720958056983651840935678432845648234649824996571,14516879516219023916337994498927792396827431792609103123314314956791565971630]);
        vk.delta2 = Pairing.G2Point([12983243756476461760830198459801736520088370378599479506773029530298496970456,6534192974725185215031672777390407669995558977737464648361166851020084750102], [6021383518693654271829936701588342378483694480761255090491347561142118486526,11367183517179255993323115023553016255079281651919157233118371033187713124620]);
        vk.IC = new Pairing.G1Point[](4);
        vk.IC[0] = Pairing.G1Point(2167085800222096713180732422457474136538350066703534812900119408276414456225, 12162319478867194598275888742443073340035212163654864518464827040090065020874);
        vk.IC[1] = Pairing.G1Point(14536775687288981221950465179997995816432826696748242165916820966794856082101, 20713570724197470100098672302446833435278601422878601706432536129829266847963);
        vk.IC[2] = Pairing.G1Point(7211386787896200346033717234712184844590696999070388680056803846396624128003, 17696067934088922070570870554303324746678305158431052577783813132064499236617);
        vk.IC[3] = Pairing.G1Point(1281208883758058702403896141959251606869342972377394575862258384368536514539, 10637511945353216075520842097501553508296886824481815618485544971705719623783);
    }

    function verifyingTransactionKey() pure internal returns (VerifyingKey memory vk) {

        vk.alfa1 = Pairing.G1Point(18428060062644935721837539465049561036521044112711857172021734053378365457327, 21460290718033134317966251223028130871021656662152640620763079815387741714152);
        vk.beta2 = Pairing.G2Point([11791524271274357784570792174673819188775454801154010069436283615244507204225,2577626513492141125984451175855196739452968985767518907666115070837116341889], [10538738232292279639034776081212826275550014166351503063810511992047578399012,7357617421592929232670734220830014146535910590607073313828048582321968821805]);
        vk.gamma2 = Pairing.G2Point([3386075915406089346709939015114573891316598770012008673550134992390867175571,14539576196794494581160326916136620241941500621044338624402454860735854802316], [21602439268321237385265170789378249022819865094647124970990034574274905257069,17283925469174077387043764478140822853768914590232349052306008843216243337271]);
        vk.delta2 = Pairing.G2Point([15829503351743374687764216583909096030015381190673361575816412129540299746690,5013801355253487158060215548643100170358395273690664787602273777073136112800], [12205405250252907948189860693441007642626280743172859212250189260388925706255,17010115132565020168956524614077438732029411684911657857766617202712027415827]);
        vk.IC = new Pairing.G1Point[](16);
        vk.IC[0] = Pairing.G1Point(15376404442188974017580422065202987237940045989425917112925102293296438667739, 13064503485915952909906778279807071616637770274682192047580623157768661616468);
        vk.IC[1] = Pairing.G1Point(1935648823143993997002268897620842623324256284853962548932361939671397873598, 16662726623051382316752145038819112253703208089137198324847821325647902812461);
        vk.IC[2] = Pairing.G1Point(12313328644943634899800094150409640286655782218998017990089451286363088268003, 6487125181274589481665605160909485958926910170206517185877874743434365494221);
        vk.IC[3] = Pairing.G1Point(12876278773846448400602341511616487194914220956157757336897250816477701091781, 3149243205877113689147117586084237973076817716918569339849609659362264855756);
        vk.IC[4] = Pairing.G1Point(8064416201699996570090724636291139158281637465066520531686991858200514601528, 280686034118661082892316726011934740884793147308566513133270045385816666007);
        vk.IC[5] = Pairing.G1Point(217910144566574318077306812753454343374334447455066251858107235097971837645, 4519727948936237084845512838416577819851853888411919689695026606930640400124);
        vk.IC[6] = Pairing.G1Point(19282925527159331106819516965717043185321288229551839240823305181902853663899, 15379916307212316066007389734240592714106920160937566418217581249912801147438);
        vk.IC[7] = Pairing.G1Point(7719982826870660733299242817844618148938958409812560305682430435235810576831, 20610606492456935653283866435266716674181934242493296823964852666242503524462);
        vk.IC[8] = Pairing.G1Point(1403119265051857938447973428441713165699356121684267641137283095806844286787, 4610052497572490701254172118072866602677612943040199823550041094824183670460);
        vk.IC[9] = Pairing.G1Point(13726123456227549051942689719883044677975487481023048397834730647879456551123, 12496161078004230297336917638199260659254293850986332147694655845814895293342);
        vk.IC[10] = Pairing.G1Point(15189770701908890939509169823056712611226246492957056204871889303699639642344, 2264930857276615859114425695332672136703122521548556818166824897550692453123);
        vk.IC[11] = Pairing.G1Point(17354192862947974259464941105191670745271090658162017779338518993344756401778, 8720078569405036264694971986490267023962909934291434760502166995230831217964);
        vk.IC[12] = Pairing.G1Point(12055033108849433056892784970821850363358621368744258123669966694662076953628, 14261849909784661152026930058376931635721078195083427531217970645714111977967);
        vk.IC[13] = Pairing.G1Point(9314490609506915249765744045688358177288229985776814283637398291404391755645, 4681408947385558777563160428486678222838959235609642841193270840166848451053);
        vk.IC[14] = Pairing.G1Point(20166830172125723119262419138920469854969731647226373552618861092510843304474, 20321300408771832548135964374625905348792271419137714127312311485626804628068);
        vk.IC[15] = Pairing.G1Point(3785461831760472783413725780897199367364086046334952289282642118753585454512, 15747789863760398149310268260087486041580712260153397816134263788661545633901);
    }

    function verifyingWithdrawalKey() pure internal returns (VerifyingKey memory vk) {

        vk.alfa1 = Pairing.G1Point(2142331282644787403308462552689226745757877623616513134529529167729333922858, 1660298320050819077348094667094946300314880576966122471000099143137098174796);
        vk.beta2 = Pairing.G2Point([9993193261519367180512138975154908031107368035572415979278078988054345264715,2832113967442415607445539398959551926993689192266977475840646464287323931103], [20840377128337130471025982767958336373185124439250483078445138741816791172253,15739796646910173421322859093658085140787180826618667611411394418590627951552]);
        vk.gamma2 = Pairing.G2Point([20430743288307734701564128583146986156235878956679928547095630151692677674339,8552912200618933051375180848071604503039725574006869439615814429082331015591], [19882965906616625269593655002947250703533640592018641672452629342452268317030,14970641025386142209498590645622173684417084674379548380674970399748317238432]);
        vk.delta2 = Pairing.G2Point([13124938766849620906150650795169689648339476697718879280106056247494348611841,13189196342193853441269392233103152231083937794010714279369005399407577778157], [14560006693325924106214325836601977302882834404110418660292015888316675443696,319919012188372576103978169195000074243552049138409708499965755836912019116]);
        vk.IC = new Pairing.G1Point[](5);
        vk.IC[0] = Pairing.G1Point(2471280275897323180822805076401392950254321226265144750968082549364313999779, 18148216701684405036582582174532873616059619511218452602888540842421630677265);
        vk.IC[1] = Pairing.G1Point(17038337254455736567871633267970675224206429703766257411116632355681472113533, 2506950409933617884547992258767352276760197557966733836778184800222548285772);
        vk.IC[2] = Pairing.G1Point(1557989813990441147922219471270023798355300026270097798011869946087577045238, 12346083143103619604725030992349346532069521004575507194968675671010051944191);
        vk.IC[3] = Pairing.G1Point(2049265524728930529823624880189048645265048493149859340041225053208998750941, 7821617796188629870651393970604789177351495828344074799796277328022948103358);
        vk.IC[4] = Pairing.G1Point(16905949001061357977287160666977296034133818491866722495744761385586958110102, 4449684441074493392682873125645755402522948922928974708870743644318957522609);
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
