import { Novel } from '../types';

export const SAMPLE_NOVELS: Novel[] = [
  {
    id: 'sample-de-men-phieu-luu-ky',
    title: 'Dế Mèn Phiêu Lưu Ký',
    author: 'Tô Hoài',
    description: 'Tác phẩm văn học kinh điển của nhà văn Tô Hoài kể về cuộc phiêu lưu tự lập và trưởng thành của chú Dế Mèn qua thế giới loài vật đầy kỳ thú và bài học làm người sâu sắc.',
    coverUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80',
    genres: ['Văn học Việt Nam', 'Thiếu nhi', 'Phiêu lưu', 'Kinh điển'],
    language: 'vi',
    sourceFormat: 'epub',
    status: 'reading',
    progress: {
      currentChapterIndex: 0,
      scrollPercentage: 0,
      lastReadAt: new Date().toISOString(),
      totalTimeSpentSeconds: 420,
    },
    bookmarks: [],
    totalWords: 3450,
    rating: 5,
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date().toISOString(),
    chapters: [
      {
        id: 'c1',
        chapterIndex: 0,
        title: 'Chương 1: Tôi sống độc lập từ thuở bé - Sự ngỗ nghịch đầu đời',
        wordCount: 1120,
        content: `Tôi sống độc lập từ thuở bé. Ấy là tục lệ lâu đời trong họ dế chúng tôi. Vả lại, mẹ thường bảo chúng tôi rằng: "Phải như thế để các con biết kiếm ăn một mình cho quen đi. Con cái mà cứ nhong nhóng ăn bám bố mẹ thì chỉ sinh ra tính ỷ lại, xấu lắm, rồi ra đời không làm nên trò trống gì đâu".

Bởi thế, lứa sinh nào cũng vậy, đẻ xong là mẹ dẫn chúng tôi đi tìm chỗ ở riêng. Cả thảy có ba anh em, mẹ chia cho mỗi đứa một cái hang nhỏ ở ven bờ đầm.

Tôi bắt đầu cuộc đời độc lập như thế đấy.

Hồi ấy, tôi béo tốt lắm. Đôi càng tôi mẫm bóng. Những cái vuốt ở chân, ở khoeo cứ cứng dần và nhọn hoắt. Thỉnh thoảng, muốn thử sự lợi hại của những chiếc vuốt, tôi co cẳng lên, đạp phanh phách vào các ngọn cỏ. Những ngọn cỏ gãy rạp, y như có nhát dao vừa lia qua. Đôi cánh tôi, trước kia ngắn hủn hoẳn, bây giờ thành cái áo bào kín xuống tận chấm đuôi. Mỗi khi tôi vũ lên, đã nghe tiếng phành phạch giòn giã. Lúc tôi đi bách bộ thì cả người tôi rung rinh một màu nâu bóng mỡ soi gương được và rất ưa nhìn. Đầu tôi to ra và nổi từng tảng, rất bướng. Hai cái răng đen nhánh lúc nào cũng nhai ngoàm ngoạm như hai lưỡi xẻng máy làm việc. Sợi râu tôi dài và uốn cong một vẻ rất đỗi hùng dũng. Tôi lấy làm hãnh diện với bà con về cặp râu ấy lắm. Cứ chốc chốc tôi lại trịnh trọng và khoan thai đưa cả hai chân trước lên vuốt râu.

Tôi đi đứng oai vệ. Mỗi bước đi, tôi làm điệu dún dẩy các khoeo chân, rung lên rung xuống hai chiếc râu. Cho ra kiểu con nhà võ. Tôi tợn lắm. Dám cà khịa với tất cả mọi bà con trong xóm. Khi tôi lên tiếng thì ai cũng phải chú ý. Đi qua bờ ruộng nào thấy mấy chị Cào Cào đang phơi nắng, tôi cũng giơ càng giương râu dọa nạt làm mấy chị sợ cuống cuồng nhảy bay biến mất.`
      },
      {
        id: 'c2',
        chapterIndex: 1,
        title: 'Chương 2: Bài học đường đời đầu tiên - Nỗi ân hận muộn màng',
        wordCount: 1250,
        content: `Bên cạnh hang tôi có cái hang của Dế Choắt. Dế Choắt là tên tôi đặt cho nó một cách chế giễu và trịch thượng thế. Choắt nọ có lẽ cũng trạc tuổi tôi. Nhưng vì gầy gò và ốm yếu quá nên tôi khinh như rác.

Chàng Dế Choắt người gầy gò và dài lêu nghêu như một gã nghiện thuốc phiện. Đã thanh niên rồi mà cánh chỉ ngắn củn đến giữa lưng, hở cả sườn như người cởi trần mặc áo gi-lê. Đôi càng bè bè, nặng nề, trông đến xấu. Râu ria gì mà cụt có một mẩu và mặt mũi thì lúc nào cũng ngơ ngơ ngác ngác.

Một hôm, tôi đứng ngoài cửa hang nhìn sang, thấy Choắt đang loay hoay bới đất đào hang. Cái hang của Choắt nông toèn toẹt, chỉ cần một trận mưa rào là ngập đến cổ.

Tôi cất giọng trịch thượng gọi:
— Này, Dế Choắt kia! Đào bới gì mà nông tếch thế? Chú mày có muốn sống yên thân thì phải đào sâu, ngoắt ngoéo vào chứ!

Choắt ngẩng lên, thở dài sườn sượt:
— Khổ lắm anh ơi, em yếu đuối, ăn bữa nay lo bữa mai, sức đâu mà khoét sâu được. Hay là... em nhờ anh một việc được không?

Tôi hất râu:
— Việc gì? Nói mau!

Choắt e dè:
— Anh có lòng tốt thương em thì cho em thông sang hang anh một cái ngách. Nhỡ khi có chuyện gì nguy cấp, em chạy sang nhờ anh...

Tôi cười phá lên một tràng giễu cợt:
— Hừ! Thông ngách sang nhà ta ư? Dễ nghe nhỉ! Chú mày hôi như cú mèo thế này, ta nào chịu được. Thôi, im cái điệu hát mưa dầm sùi sụt ấy đi. Đào tổ nông thì chết cũng đáng đời!

Tôi nguẩy mông quay đi, không thèm đoái hoài gì đến Choắt nữa. Ôi, thói kiêu căng ngạo mạn ấy đã đẩy tôi vào một tai họa khôn lường!`
      },
      {
        id: 'c3',
        chapterIndex: 2,
        title: 'Chương 3: Thoát khỏi tay hai đứa trẻ - Lên đường phiêu lưu bốn phương',
        wordCount: 1080,
        content: `Sau cái chết thảm thương của Dế Choắt vì trò đùa dại dột trêu chị Cốc của tôi, tôi đã đắp một nấm mộ thật cao cho bạn và đứng lặng hồi lâu suy nghĩ về bài học đường đời đầu tiên. Tôi hiểu rằng thói hung hăng, bậy bạ có óc mà không biết nghĩ sớm muộn rồi cũng rước vạ vào thân.

Thời gian trôi qua, lòng tôi lại rạo rực khát khao được đi đây đi đó. Tôi không thể chịu được cuộc sống quanh quẩn bên cái hang chật hẹp ven bờ đầm.

Bầu trời ngoài kia bao la quá! Dòng sông xanh biếc chảy về đâu? Đằng sau những rặng tre ngút ngàn là những xứ sở nào?

Một buổi sáng mùa thu trong trẻo, sương giăng mờ trên mặt nước và gió thu se lạnh thổi qua những bờ cỏ non, tôi xếp lại ít hành trang, từ biệt mẹ và người thân. Tôi ngẩng cao đầu bước ra con đường thiên lý.

Từ nay, tôi sẽ làm một kẻ lữ hành bốn biển, kết bạn muôn phương, bênh vực kẻ yếu và thực hiện lý tưởng đại đồng của muôn loài dế!`
      }
    ]
  },
  {
    id: 'sample-hoang-tu-be',
    title: 'Hoàng Tử Bé (Le Petit Prince)',
    author: 'Antoine de Saint-Exupéry',
    description: 'Câu chuyện triết lý tuyệt đẹp và sâu lắng về tình bạn, tình yêu và cái nhìn trong trẻo của trẻ thơ giữa một thế giới người lớn đầy bận rộn và toan tính.',
    coverUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=600&q=80',
    genres: ['Văn học kinh điển', 'Triết lý', 'Cổ tích hiện đại'],
    language: 'vi',
    sourceFormat: 'json',
    status: 'favorite',
    progress: {
      currentChapterIndex: 1,
      scrollPercentage: 35,
      lastReadAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      totalTimeSpentSeconds: 960,
    },
    bookmarks: [
      {
        id: 'bm-1',
        novelId: 'sample-hoang-tu-be',
        chapterIndex: 1,
        chapterTitle: 'Chương 2: Cuộc gặp gỡ kỳ lạ giữa sa mạc Sahara',
        percentage: 35,
        textSnippet: '"Làm ơn... vẽ cho tôi một con cừu!"',
        createdAt: new Date().toISOString()
      }
    ],
    totalWords: 2890,
    rating: 5,
    createdAt: new Date(Date.now() - 86400000 * 12).toISOString(),
    updatedAt: new Date().toISOString(),
    chapters: [
      {
        id: 'hp1',
        chapterIndex: 0,
        title: 'Chương 1: Bức tranh con trăn nuốt con voi',
        wordCount: 890,
        content: `Năm lên sáu tuổi, có một lần tôi nhìn thấy một bức tranh tuyệt diệu trong một cuốn sách về Rừng Nguyên Thủy, nhan đề "Những chuyện có thật". Bức tranh vẽ một con trăn lớn đang nuốt chửng một con thú hoang dã.

Cuốn sách viết rằng: "Loài trăn nuốt trọn vẹn con mồi mà không cần nhai. Sau đó chúng không thể nhúc nhích được nữa và phải ngủ suốt sáu tháng trời để tiêu hóa".

Tôi đã suy nghĩ rất nhiều về những cuộc thám hiểm trong rừng sâu, và với một cây bút chì màu, tôi đã vẽ bức tranh đầu tiên trong đời. Đó là Bức tranh số 1.

Tôi mang tác phẩm tuyệt tác của mình khoe với người lớn và hỏi xem họ có thấy sợ không.
Họ trả lời: "Tại sao lại phải sợ một cái mũ?".

Bức tranh của tôi đâu có vẽ cái mũ. Nó vẽ một con trăn đang nuốt một con voi! Vì thế tôi vẽ thêm Bức tranh số 2: tôi vẽ ruột con trăn mở ra, để người lớn có thể hiểu rõ. Người lớn lúc nào cũng cần được giải thích!`
      },
      {
        id: 'hp2',
        chapterIndex: 1,
        title: 'Chương 2: Cuộc gặp gỡ kỳ lạ giữa sa mạc Sahara',
        wordCount: 1100,
        content: `Tôi đã sống cô độc như thế, chẳng có ai để thực sự trò chuyện, cho đến khi máy bay của tôi gặp sự cố rơi xuống sa mạc Sahara cách đây sáu năm. Có một cái gì đó trong động cơ bị vỡ. Và vì không có thợ máy hay hành khách nào đi cùng, tôi phải tự mình cáng đáng một cuộc sửa chữa cam go sống còn. Với tôi đó là vấn đề sinh tử: nước uống dự trữ chỉ đủ dùng cho tám ngày.

Đêm đầu tiên, tôi ngủ thiếp đi trên cát, cách xa mọi nơi có người ở tới cả ngàn dặm. Tôi còn cô độc hơn một kẻ đắm tàu bám trên chiếc bè giữa đại dương.

Vì thế, các bạn hãy tưởng tượng nỗi kinh ngạc của tôi, khi bình minh vừa hé rạng, có một giọng nói mỏng manh lạ kỳ đánh thức tôi dậy:
— Làm ơn... hãy vẽ cho tôi một con cừu!
— Hả?
— Vẽ cho tôi một con cừu đi!

Tôi bật dậy như bị sét đánh. Tôi chớp mắt lia lịa, nhìn quanh thật kỹ. Và tôi nhìn thấy một cậu bé phi thường đang nghiêm trang ngắm nhìn tôi.`
      },
      {
        id: 'hp3',
        chapterIndex: 2,
        title: 'Chương 3: Bông hoa hồng kiêu kỳ và chuyến rời đi',
        wordCount: 900,
        content: `Chẳng bao lâu sau, tôi hiểu rõ hơn về bông hoa trên hành tinh của Hoàng Tử Bé. Trên tiểu hành tinh B612, xưa nay chỉ có những bông hoa giản dị, chỉ có một hàng cánh và không tốn nhiều chỗ, chúng hé nở ban mai trong cỏ rồi tàn tạ lúc hoàng hôn.

Nhưng một ngày kia, từ một hạt mầm không biết từ đâu bay tới, đã mọc lên một cành hoa kỳ lạ.

Bông hoa chuẩn bị dung nhan một cách cẩn thận phi thường trong buồng xanh kín đáo của nàng. Nàng chọn lựa màu sắc từng li từng tí, nàng ướm thử từng cánh một. Nàng không muốn xuất hiện nhàu nhĩ như loài hoa anh túc. Nàng chỉ muốn tỏa sáng trong vẻ rực rỡ toàn bích của sắc đẹp mình.

Và rồi một buổi sớm, đúng vào giờ mặt trời mọc, nàng hé nở!

Nàng ngáp dài một cách duyên dáng và cất tiếng:
— Ôi! Em vừa mới thức giấc... Em xin lỗi... Tóc tai em vẫn còn bù xù quá...

Hoàng Tử Bé không thể nén nổi sự khâm phục:
— Nàng đẹp quá chừng!`
      }
    ]
  }
];
